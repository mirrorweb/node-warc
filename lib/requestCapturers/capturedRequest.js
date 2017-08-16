const uuid = require('uuid/v1')
const getContentEncoding = require('../utils/getContentEncoding')

const oldHTTPStatuses = new Set(['HTTP/1.0', 'HTTP/1.1'])

/**
 * Represents A Unique Request And Response Chain As Made By A Page
 *
 * Consolidates The Modification Of HTTP/2 Into HTTP/1.1
 *
 * Provides Utility Functionality For Serialization To WARC
 */
class CapturedRequest {
  /**
   * @desc Create A New Captured Request
   * @param {Object} info The Object Returned By ``requestWillBeSent`` Or ``responseReceived`` Event Handlers
   * @param {boolean} [noHttp2 = false] Convert Non HTTP/1.0 Or HTTP/1.1 Protocols Into HTTP/1.1
   */
  constructor (info, noHttp2 = false) {
    /**
     * @desc Convert Non HTTP/1.0 Or HTTP/1.1 Protocols Into HTTP/1.1
     * @type {boolean}
     */
    this.noHttp2 = noHttp2

    /**
     * @desc The Unique Request Identifier
     * @type {string}
     */
    this.requestId = info.requestId

    if (info.redirectResponse !== undefined && info.redirectResponse !== null) {
      /**
       * @desc HTTP 3xx Response Information
       * @type {?Object}
       */
      this.redirectResponse = info.redirectResponse
    }

    if (info.request) {
      /**
       * @desc The Requests URL
       * @type {?string}
       */
      this.url = info.request.url

      /**
       * @desc The Request HTTP Headers
       * @type {?Object}
       */
      this.headers = info.request.headers

      /**
       * @desc The HTTP Method For This Request
       * @type {?string}
       */
      this.method = info.request.method

      if (info.request.postData !== undefined && info.request.postData !== null) {
        /**
         * @desc The Data Of A Post Request
         * @type {?Object[]}
         */
        this.postData = info.request.postData
      }
    }

    if (info.response) {
      if (!this.url) {
        this.url = info.response.url
      }

      /**
       * @desc The Response Information
       * @type {?{url: string, status: string, statusText: string, headers: Object, headersText: Object, requestHeaders: Object, requestHeadersText: Object, protocol: string, encoding: string}}
       */
      this.res = {
        url: info.response.url,
        status: info.response.status,
        statusText: info.response.statusText,
        headers: info.response.headers,
        headersText: info.response.headersText,
        requestHeaders: info.response.requestHeaders,
        requestHeadersText: info.response.requestHeadersText,
        protocol: this._correctProtocol(info.redirectResponse.protocol),
        encoding: getContentEncoding(info.response.headers, info.response.headersText)
      }

      if (!this.headers) {
        if (info.response.requestHeaders) {
          this.headers = info.response.requestHeaders
        } else if (info.response.requestHeadersText) {
          let head = {}
          let headArray = info.response.requestHeadersText.split('\r\n')
          let len = headArray.length - 2 // contains two trailing CRLF
          let i = 1
          let headSplit
          for (; i < len; ++i) {
            headSplit = headArray[i].split(': ')
            head[headSplit[0]] = headSplit[1]
          }
          this.headers = head
          let httpStringParts = headArray[0].split(' ')
          this.method = this.method || httpStringParts[0]
          this.protocol = this.protocol || this._correctProtocol(httpStringParts[2])
        }
      }

      if (!this.method) {
        if (info.response.requestHeaders) {
          let method = info.response.requestHeaders[':method']
          if (method && method !== '') {
            this.method = method
          } else if (info.response.requestHeadersText) {
            this._methProtoFromReqHeadText(info.response.requestHeadersText)
          }
        } else if (info.response.requestHeadersText) {
          this._methProtoFromReqHeadText(info.response.requestHeadersText)
        }
      }
    }
  }

  /**
   * @desc Get The Correct Protocol. Handles Lower Case Or Upper Case And {@link noHttp2}
   * @param {string} originalProtocol The Possibly HTTP/2 Protocol
   * @returns {string} The Correct Protocol Dependant On {@link noHttp2}
   * @private
   */
  _correctProtocol (originalProtocol) {
    if (originalProtocol) {
      let newProtocol = originalProtocol.toUpperCase()
      if (this.noHttp2) {
        return oldHTTPStatuses.has(newProtocol) ? newProtocol : 'HTTP/1.1'
      }
      return newProtocol
    }
    return 'HTTP/1.1'
  }

  /**
   * @desc Set The Requests Method And Protocol From The Request Headers Text
   * @param {?string} requestHeadersText The Full HTTP Headers String
   * @private
   */
  _methProtoFromReqHeadText (requestHeadersText) {
    if (requestHeadersText) {
      let httpString = requestHeadersText.substr(0, requestHeadersText.indexOf('\r\n'))
      if (httpString) {
        let httpStringParts = httpString.split(' ')
        if (httpStringParts) {
          this.method = httpStringParts[0]
          if (!this.protocol) {
            this.protocol = this._correctProtocol(httpStringParts[2])
          }
        }
      }
    }
  }

  addMaybeRedirect (info, reqMap) {
    if (info.redirectResponse) {
      if (this.redirectResponse) {
        if (Array.isArray(this.redirectResponse)) {
          this.redirectResponse.push({
            url: info.redirectResponse.url,
            status: info.redirectResponse.status,
            statusText: info.redirectResponse.statusText,
            headers: info.redirectResponse.headers,
            headersText: info.redirectResponse.headersText,
            requestHeaders: info.redirectResponse.requestHeaders || info.request.headers,
            requestHeadersText: info.redirectResponse.requestHeadersText,
            method: info.redirectResponse.method || info.request.method,
            protocol: this._correctProtocol(info.redirectResponse.protocol)
          })
        } else {
          let oldRR = this.redirectResponse
          this.redirectResponse = [oldRR, {
            url: info.redirectResponse.url,
            status: info.redirectResponse.status,
            statusText: info.redirectResponse.statusText,
            headers: info.redirectResponse.headers,
            headersText: info.redirectResponse.headersText,
            requestHeaders: info.redirectResponse.requestHeaders || info.request.headers,
            requestHeadersText: info.redirectResponse.requestHeadersText,
            method: info.redirectResponse.method || info.request.method,
            protocol: this._correctProtocol(info.redirectResponse.protocol)
          }]
        }
      }
    } else if (
      (this.headers === null || this.headers === undefined) &&
      (this.method === null || this.method === undefined) &&
      (this.url === null || this.url === undefined) &&
      (this.res !== null && this.res !== undefined)
    ) {
      // we found you!
      this.url = info.request.url
      this.headers = info.request.headers
      this.method = info.request.method
      if (info.request.postData !== undefined && info.request.postData !== null) {
        this.postData = info.request.postData
      }
      if (info.response) {
        this.addResponse(info)
      }
    } else {
      reqMap.set(`${info.requestId}${uuid()}`, new CapturedRequest(info, this.noHttp2))
    }
  }

  addResponse (info) {
    if (this.res) {
      if (Array.isArray(this.res)) {
        this.res.push({
          url: info.response.url,
          status: info.response.status,
          statusText: info.response.statusText,
          headers: info.response.headers,
          headersText: info.response.headersText,
          requestHeaders: info.response.requestHeaders,
          requestHeadersText: info.response.requestHeadersText,
          protocol: this._correctProtocol(info.response.protocol),
          encoding: getContentEncoding(info.response.headers, info.response.headersText)
        })
      } else {
        let oldRes = this.res
        this.res = [oldRes, {
          url: info.response.url,
          status: info.response.status,
          statusText: info.response.statusText,
          headers: info.response.headers,
          headersText: info.response.headersText,
          requestHeaders: info.response.requestHeaders,
          requestHeadersText: info.response.requestHeadersText,
          protocol: this._correctProtocol(info.response.protocol),
          encoding: getContentEncoding(info.response.headers, info.response.headersText)
        }]
      }
    } else {
      this.res = {
        url: info.response.url,
        status: info.response.status,
        statusText: info.response.statusText,
        headers: info.response.headers,
        headersText: info.response.headersText,
        requestHeaders: info.response.requestHeaders,
        requestHeadersText: info.response.requestHeadersText,
        protocol: this._correctProtocol(info.response.protocol),
        encoding: getContentEncoding(info.response.headers, info.response.headersText)
      }
    }
  }

  toJSON () {

  }
}

module.exports = CapturedRequest