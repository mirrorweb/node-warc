const { URL } = require('url');
const { STATUS_CODES } = require('http');
const { v4: uuidv4 } = require('uuid');
const { CRLF } = require('./warcFields');
const WARCWriterBase = require('./warcWriterBase');
const { stringifyPuppeteerHeaders, stringifyRequestHeaders } = require('../utils/headerSerializers');

/** @ignore */
const noGZ = /Content-Encoding.*(?:gzip|br|deflate)\r\n/gi;
/** @ignore */
const replaceContentLen = /Content-Length:.*\r\n/gi;

/**
 * @desc WARC Generator for use with puppeteer
 * @see https://github.com/GoogleChrome/puppeteer
 * @extends WARCWriterBase
 */
class PuppeteerWARCGenerator extends WARCWriterBase {
    constructor() {
        super();
        this._UP = new URL('about:blank');
    }

    /**
     * @desc Generate a WARC record
     * @param {Request}  request
     * @return {Promise<void>}
     */
    async generateWarcEntry(request, renderedContent) {
        let uuids = {};
        uuids['request'] = uuidv4();

        let response = request.response();
        if (response) uuids['response'] = uuidv4();

        let reqHTTP = '';
        this._UP.href = request.url();
        if (this._UP.search !== '') {
            reqHTTP += `${request.method()} ${this._UP.pathname}${this._UP.search[0]}${
                this._UP.searchParams
            } HTTP/1.1${CRLF}`;
        } else {
            reqHTTP += `${request.method()} ${this._UP.pathname} HTTP/1.1${CRLF}`;
        }

        reqHTTP += stringifyRequestHeaders(request.headers(), this._UP.host);

        let pd = null;

        if(request.method() == 'POST') {
            if (request.postData() != null) {
                pd = request.postData();
            } else if (request._mwCdpPostData != null) {
                pd = request._mwCdpPostData;
            }
        }

        await this.writeRequestRecord(this._UP.href, reqHTTP, pd, uuids);
        if (response) {
            let respHeaders = response.headers()

            if (respHeaders) {
                // If there is a link header then format it to run on one line
                if (respHeaders["link"]) {
                    respHeaders["link"] = respHeaders["link"].replaceAll("\n", ", ")
                }
            }

            let resHTTP = `HTTP/1.1 ${response.status()} ${
                STATUS_CODES[response.status()]
            } ${CRLF}${stringifyPuppeteerHeaders(respHeaders)}`;
            let pageContent;
            let wasError = false;
            try {
                if(request._mwResBuffer) {
                    pageContent = request._mwResBuffer;
                } else {
                    pageContent = renderedContent || await response.buffer();
                }
            } catch (e) {
                wasError = true;
            }
            if (!wasError) {
                resHTTP = resHTTP.replace(noGZ, '');
                resHTTP = resHTTP.replace(
                    replaceContentLen,
                    `Content-Length: ${Buffer.byteLength(pageContent, 'utf8')}${CRLF}`
                );
            }
            await this.writeResponseRecord(this._UP.href, resHTTP, pageContent, uuids['response']);
        }
    }
}

module.exports = PuppeteerWARCGenerator;
