class PuppeteerRequestCapturer {
  /**
   * @param {Page} page
   */
  constructor (page) {
    /**
     * @desc To Capture Requests Or Not To Capture Requests
     * @type {boolean}
     * @private
     */
    this._capture = true

    /**
     * @desc A list of requests made
     * @type {Array<Request>}
     * @private
     */
    this._requests = []

    this.page = page
    this.requestWillBeSent = this.requestWillBeSent.bind(this)
    this.page.on('request', this.requestWillBeSent)
    // preload the buffer for every piece of page content
    this.page.on('response', async (response) => {
      try {
        const buf = await response.buffer();

        for(let request of this._requests) {
          if(response.request()._requestId == request._requestId) {
            request._mwResBuffer = buf;
            break;
          }
        }
      } catch(e) {
        console.warn(`Could not preload buffer for ${response.url()} (request type of ${response.request().method()}): ${e}`)
      }
    })
  }

  /**
   * @desc Sets an internal flag to begin capturing network requests. Clears Any Previously Captured Request Information
   */
  startCapturing () {
    this._requests.length = 0
    this._capture = true
  }

  /**
   * @desc Sets an internal flag to stop the capturing network requests
   */
  stopCapturing () {
    this._capture = false
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/@@iterator
   * @desc Get An Iterator Over The Requests Captured
   * @returns {Iterator<Request>}
   */
  [Symbol.iterator] () {
    return this._requests[Symbol.iterator]()
  }

  /**
   * @desc Remove All Requests
   */
  clear () {
    this._requests.length = 0
  }

  requests () {
    return this._requests
  }

  /**
   * @return {Iterator<Request>}
   */
  * iterateRequests () {
    let i = 0
    let len = this._requests.length
    for (; i < len; i++) {
      yield this._requests[i]
    }
  }

  requestWillBeSent (r) {
    if (this._capture) {
      this._requests.push(r)
    }
  }
}

module.exports = PuppeteerRequestCapturer
