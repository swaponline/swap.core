import SwapApp, { SwapInterface, constants } from 'swap.app'


class CashSwap extends SwapInterface {

  /**
   *
   * @param {object}    options
   * @param {string}    options.url
   * @param {function}  options.fetchBalance
   * @param {function}  options.getURL
   * @param {function}  options.openURL
   */
  constructor(options) {
    super()

    if (!options.url) {
      throw new Error('CashSwap: "url" required')
    }

    if (typeof options.fetchBalance !== 'function') {
      throw new Error('CashSwap: "fetchBalance" required')
    }

    if (typeof options.getURL !== 'function') {
      throw new Error('CashSwap: "getURL" required')
    }

    if (typeof options.openURL !== 'function') {
      throw new Error('CashSwap: "openURL" required')
    }

    this._swapName      = constants.COINS.cash

    this.url            = options.url || 'http://net2pay.o.atwinta.ru/'

    this.fetchBalance   = options.fetchBalance
    this.getURL         = options.getURL
    this.openURL        = options.openURL
  }

  _initSwap() {

  }

  /**
   *
   * @param {object} data
   * @param {string} data.secretHash
   * @param {string} data.participantCard
   * @param {number} data.amount
   // * @param {function} handleTransactionHash
   * @returns {Promise}
   */
  create(data) {
    const { secretHash, participantCard, amount } = data

    // http://net2pay.o.atwinta.ru/?hash=&validity=3&amount=4000
    // http://net2pay.o.atwinta.ru/?amount=4000&hash=16920f1992c3409ecd2aa5247357b14fb54aebe9&validity=3
    const create_url = `${this.url}/?hash=${secretHash}&validity=3&amount=${amount}`

    return this.getURL(create_url)
  }

  /**
   *
   * @param {object} data
   * @param {string} data.secretHash
   * @returns {Promise}
   */
  fund(data) {
    const { secretHash } = data

    const fund_url = `${this.url}/sender/?hash=${secretHash}`

    return this.openURL(fund_url)
  }

  /**
   *
   * @param {object} data
   * @param {string} data.secretHash
   * @returns {Promise}
   */
  withdraw(data) {
    const { secret, secretHash } = data

    // const _secretHash = crypto.ripemd160(Buffer.from(secret, 'hex')).toString('hex')

    const withdraw_url = `${this.url}/recipient/?hash=${secretHash}`

    return this.openURL(withdraw_url)
  }
}

export default CashSwap
