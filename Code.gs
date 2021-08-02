class _Fixer {

  /**
   * @param {function} fetcher the fetcher function from apps script- passed over to keep lib dependency free
   * @param {string} apiKey the fixer.io apiKey
   * @param {string} [defaultBase] the default base currency - this doesn't with the Free version of fixer.io so don't specify it
   */
  constructor({ fetcher, apiKey, defaultBase }) {
    this.apiKey = apiKey
    this.fetcher = fetcher
    this.defaultBase = defaultBase
    this.endpoint = 'http://data.fixer.io/api/'
    if (!this.apiKey) throw new Error('apiKey property not provided - goto fixer.io to get one and pass to constructor')
    if (!this.fetcher) throw new Error('fetcher property not provided- pass urlfetchapp.fetch to constructor')

  }

  /**
   * private
   * make url params
   * @param {object} params to add to the access key url params
   * @returns {string} the url params formatted
   */
  _makeParams(params) {
    const a = {
      access_key: this.apiKey,
      ...params
    }
    return `?${Object.keys(a).filter(k => a[k]).map(k => k + '=' + a[k]).join('&')}`
  }

  /**
   * private
   * add the base or default base - nor available with the free version of fixer
   * @param {object} params to add to the access key url params
   * returns {object} the updated params upject with the base added
   * 
   */
  _fixParams(params = {}) {
    const base = params.base || this.defaultBase
    return this._makeParams({
      ...params,
      base
    })

  }
  /**
   * private
   * add the api path and params to create a url
   * @param {string} path the api path
   * @param {object} params to add to the access key url params
   * @returns {string} a url
   */
  _url(path, params) {
    if (!path) throw new Error(`internal error: path missing from url`)
    const u = this.endpoint + path + this._fixParams(params)
    return u
  }

  /**
   * private
   * @param {string} url the complete url
   * @returns {object} the api response parsed
   */
  _fetch(url) {
    const response = this.fetcher(url)
    return JSON.parse(response.getContentText())
  }

  /**
   * return the latest data for the selected currencies
   * @param {object} params to add to the access key url params - should be {symbols: 'usd,gbp,...etc'}
   * @returns {object} the api response parsed
   */
  latest(params) {
    return this._fetch(this._url('latest', params))
  }

  /**
   * return historical data for the selected currencies
   * @param {object} params to add to the access key url params - should be {symbols: 'usd,gbp,...etc', start_date: 'yyyy-mm-dd'}
   * @returns {object} the api response parsed
   */
  onThisDay(params) {
    if (!params.start_date) throw new Error(`onThisDay needs a start_date parameter in this format YYYY-MM-DD`)
    return this._fetch(this._url(params.start_date, {
      ...params,
      start_date: null
    }))
  }
  // the free version doesn't expose the built in convert, but we can hack it with a previous result
  // example fixerResult
  /**
   * {
    "success": true,
    "historical": true,
    "date": "2013-12-24",
    "timestamp": 1387929599,
    "base": "GBP",
    "rates": {
        "USD": 1.636492,
        "EUR": 1.196476,
        "CAD": 1.739516
    }
   }
   */

  /**
   * do a conversion without using the api as its not available in the free tier
   * @param {object} fixerResult an api response parsed as recevied by onThisDay() or latest()
   * @param {object} options
   * @param {string} options.from the from currency
   * @param {string} options.to the to currency
   * @param {number} [options.amount=1] the amount to convert
   * @returns {object} an emulation of a return from fixer.convert
   */
  hackConvert(fixerResult, { from, to, amount = 1 }) {
    // check that the result is a valid one
    if (!fixerResult.success) throw new Error('input fixerResult was not a success')
    // and that it contains both from and to rates
    const { rates } = fixerResult
    if (!rates[from]) throw new Error('from currency not found in fixerResult')
    if (!rates[to]) throw new Error('to currency not found in fixerResult')
    const rate = rates[to] / rates[from]
    const result = rate * amount

    // emulate the fixer convert response
    return {
      success: true,
      query: {
        from,
        to,
        amount
      },
      info: {
        timestamp: fixerResult.timestamp,
        rate
      },
      historical: fixerResult.historical,
      date: fixerResult.date,
      result
    }

  }


}

  // to export a class from a library as apps script doesn't appear to export classes properly
  var Fixer = (options) => new _Fixer(options)
