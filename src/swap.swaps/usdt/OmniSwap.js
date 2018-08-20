const bitcoin = require('bitcoinjs-lib')
const net = process.env.NETWORK === 'testnet'
  ? bitcoin.networks.testnet
  : bitcoin.networks.bitcoin

const getUnspents = require('./unspents')
const createScript = require('./swap_script')
const createOmniScript = require('./omni_script')
const signTransaction = require('./sign_tx')
const getAddress = require('./get_address')

const DUST = 546

class OmniSwap {
  /**
   *
   * @param options
   * @param options.assetId
   * @param options.fetchBalance
   * @param options.fetchUnspents
   * @param options.broadcastTx
   */
  constructor(options) {
    if (typeof options.fetchBalance !== 'function') {
      throw new Error('OmniSwap: "fetchBalance" required')
    }
    if (typeof options.fetchUnspents !== 'function') {
      throw new Error('OmniSwap: "fetchUnspents" required')
    }
    if (typeof options.broadcastTx !== 'function') {
      throw new Error('OmniSwap: "broadcastTx" required')
    }

    this._swapName      = 'USDT'
    this.coin           = options.assetId || 31
    this.fetchBalance   = options.fetchBalance
    this.fetchUnspents  = options.fetchUnspents
    this.broadcastTx    = options.broadcastTx
  }

  async createScript(data) {
    const { recipientPublicKey, ownerPublicKey, locktime, secretHash } = data

    return createScript(secretHash, ownerPublicKey, recipientPublicKey, locktime)
  }

  async fundScript(data) {
    const { scriptAddress } = data



  }

  /**
   * takes keys and params, returns everything needed for omni output
   */
  async simpleSend(data) {
    const { owner, to_address, amount, doSend } = data

    const from_address = owner.getAddress()
    const btc_amount = DUST

    const input = { from_address, amount: btc_amount }
    const { tx, skipValue, fundValue } = await this.buildInput(input)

    const omniScript = createOmniScript(amount, this.coin)

    tx.addOutput(to_address, fundValue)
    tx.addOutput(omniScript, 0)
    tx.addOutput(from_address, skipValue)

    const signed = this.signInputs({ tx, owner })

    const final = signed.build()

    if (doSend) {
      this.broadcastTx(final.toHex())
    }

    console.log('hex', final.toHex())

    return final
  }

  async buildInput(data) {
    const { from_address, amount } = data

    const tx = new bitcoin.TransactionBuilder(net)

    const unspents = await this.fetchUnspents(from_address)

    const fundValue     = amount
    const feeValue      = 1000
    const totalUnspent  = unspents.reduce((summ, { satoshis }) => summ + satoshis, 0)
    const skipValue     = totalUnspent - fundValue - feeValue

    if (totalUnspent < feeValue + fundValue) {
      throw new Error(`Total less than fee: ${totalUnspent} < ${feeValue} + ${fundValue}`)
    }

    unspents.forEach(({ txid, vout }) => tx.addInput(txid, vout, 0xfffffffe))

    return {
      tx,
      skipValue,
      fundValue,
    }
  }

  signInputs(data) {
    const { tx, owner } = data

    tx.inputs.forEach((input, index) => {
      tx.sign(index, owner)
    })

    return tx
  }

}

module.exports = OmniSwap
