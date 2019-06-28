import debug from 'debug'
import SwapApp, { SwapInterface, constants } from 'swap.app'
import BigNumber from 'bignumber.js'


class BchSwap extends SwapInterface {

  /**
   *
   * @param options
   * @param options.fetchBalance
   * @param options.fetchUnspents
   * @param options.broadcastTx
   * @param options.fetchTxInfo {(tx_hash) => Promise({ confidence, fees })}
   * @param options.estimateFeeValue { ({ inSatoshis, speed, address, txSize }) => Promise(fee_value) }
   */
  constructor(options) {
    super()

    if (typeof options.fetchBalance !== 'function') {
      throw new Error('BchSwap: "fetchBalance" required')
    }
    if (typeof options.fetchUnspents !== 'function') {
      throw new Error('BchSwap: "fetchUnspents" required')
    }
    if (typeof options.broadcastTx !== 'function') {
      throw new Error('BchSwap: "broadcastTx" required')
    }
    if (typeof options.fetchTxInfo !== 'function') {
      // tx_hash => { confidence, fees }
      console.warn(`BchSwap: "fetchTxInfo" is not a function. You will not be able to use tx-confidence feature`)
    }
    if (typeof options.estimateFeeValue !== 'function') {
      // ({ speed } = {}) => feeRate
      console.warn(`BchSwap: "estimateFeeValue" is not a function. You will not be able use automatic mempool-based fee`)
    }

    this._swapName      = constants.COINS.bch
    this.fetchBalance   = options.fetchBalance
    this.fetchUnspents  = options.fetchUnspents
    this.broadcastTx    = options.broadcastTx
    this.feeValue       = options.feeValue || 546
    this.fetchTxInfo    = options.fetchTxInfo || (() => {})
    this.estimateFeeValue = options.estimateFeeValue || (() => 0)
  }

  _initSwap(app) {
    super._initSwap(app)

    this.app = app

    this.network = (
      this.app.isMainNet()
        ? this.app.env.bitcoincash.networks.bitcoincash
        : this.app.env.bitcoincash.networks.testnet
    )
  }

  /**
   *
   * @param {object} options
   * @param {boolean} options.inSatoshis
   * @param {Number} options.size
   * @param {String} options.speed
   * @param {String} options.address
   * @returns {BigNumber}
   * @public
   */
  async getTxFee({ inSatoshis, size, speed = 'fast', address } = {}) {
    let estimatedFee = BigNumber(await this.estimateFeeValue({ inSatoshis, address, speed, txSize: size }))

    this.feeValue = estimatedFee

    return inSatoshis
      ? estimatedFee
      : estimatedFee.dividedBy(1e8).dp(0, BigNumber.ROUND_UP)
  }

  /**
   *
   * @param {array} unspents
   * @param {Number} expectedConfidenceLevel
   * @returns {array}
   * @private
   */
  async filterConfidentUnspents(unspents, expectedConfidenceLevel = 0.95) {
    const feesToConfidence = async (fees, size, address) => {
      const currentFastestFee = await this.getTxFee({ inSatoshis: true, size, speed: 'fast', address })

      debug('swap.core:swaps')(`currentFastestFee: ${currentFastestFee}`)

      return BigNumber(fees).isLessThan(currentFastestFee)
        ? BigNumber(fees).dividedBy(currentFastestFee).toNumber()
        : 1
    }

    const confirmationsToConfidence = confs => confs > 0 ? 1 : 0

    const fetchConfidence = async ({ txid, confirmations }) => {
      const confidenceFromConfirmations = confirmationsToConfidence(confirmations)

      if (BigNumber(confidenceFromConfirmations).isGreaterThanOrEqualTo(expectedConfidenceLevel)) {
        return confidenceFromConfirmations
      }

      try {
        const info = await this.fetchTxInfo(txid)

        const { confidence, fees, size, senderAddress } = info

        debug('swap.core:swaps')(`tx ${txid}:`, { confidence, confirmations, fees, size, senderAddress })

        if (BigNumber(confidence).isGreaterThan(0)) {
          return confidence
        }

        if (fees) {
          return await feesToConfidence(fees, size, senderAddress)
        }

        throw new Error(`txinfo=${{ confidence, confirmations, fees, size, senderAddress }}`)

      } catch (err) {
        console.error(`BchSwap: Error fetching confidence: using confirmations > 0:`, err.message)
        return confidenceFromConfirmations
      }
    }

    const confidences = await Promise.all(unspents.map(fetchConfidence))

    return unspents.filter((utxo, index) => {
      debug('swap.core:swaps')(`confidence[${index}]:`, confidences[index])
      return BigNumber(confidences[index]).isGreaterThanOrEqualTo(expectedConfidenceLevel)
    })
  }

  /**
   *
   * @param {object} data
   * @param {object} data.script
   * @param {*} data.tx
   * @param {string} data.secret
   * @param {number} inputIndex
   * @private
   */
  _signTransaction(data, inputIndex = 0) {
    debug('swap.core:swaps')('signing script input', inputIndex)
    const { script, txRaw, secret, value } = data

    const hashType = this.app.env.bitcoincash.Transaction.SIGHASH_ALL
      | this.app.env.bitcoincash.Transaction.SIGHASH_BITCOINCASHBIP143
    const signatureHash = txRaw.hashForCashSignature(inputIndex, script, value, hashType)

    const signature = this.app.services.auth.accounts.bch.sign(signatureHash).toScriptSignature(hashType)

    const scriptSig = this.app.env.bitcoincash.script.scriptHash.input.encode(
      [
        signature,
        this.app.services.auth.accounts.bch.getPublicKeyBuffer(),
        Buffer.from(secret.replace(/^0x/, ''), 'hex'),
      ],
      script,
    )

    txRaw.setInputScript(inputIndex, scriptSig)
  }

  /**
   *
   * @param {object} data
   * @param {string} data.secretHash
   * @param {string} data.ownerPublicKey
   * @param {string} data.recipientPublicKey
   * @param {number} data.lockTime
   * @returns {{scriptAddress: *, script: (*|{ignored})}}
   */
  createScript(data, hashName = 'ripemd160') {
    const hashOpcodeName = `OP_${hashName.toUpperCase()}`
    const hashOpcode = this.app.env.bitcoincash.opcodes[hashOpcodeName]

    const { secretHash, ownerPublicKey, recipientPublicKey, lockTime } = data

    const script = this.app.env.bitcoincash.script.compile([

      hashOpcode,
      Buffer.from(secretHash, 'hex'),
      this.app.env.bitcoincash.opcodes.OP_EQUALVERIFY,

      Buffer.from(recipientPublicKey, 'hex'),
      this.app.env.bitcoincash.opcodes.OP_EQUAL,
      this.app.env.bitcoincash.opcodes.OP_IF,

      Buffer.from(recipientPublicKey, 'hex'),
      this.app.env.bitcoincash.opcodes.OP_CHECKSIG,

      this.app.env.bitcoincash.opcodes.OP_ELSE,

      this.app.env.bitcoincash.script.number.encode(lockTime),
      this.app.env.bitcoincash.opcodes.OP_CHECKLOCKTIMEVERIFY,
      this.app.env.bitcoincash.opcodes.OP_DROP,
      Buffer.from(ownerPublicKey, 'hex'),
      this.app.env.bitcoincash.opcodes.OP_CHECKSIG,

      this.app.env.bitcoincash.opcodes.OP_ENDIF,
    ])

    const scriptPubKey  = this.app.env.bitcoincash.script.scriptHash.output.encode(this.app.env.bitcoincash.crypto.hash160(script))
    const scriptAddress = this.app.env.bitcoincash.address.fromOutputScript(scriptPubKey, this.network)

    return {
      scriptAddress,
      script,
    }
  }

  /**
   *
   * @param {object} data
   * @param {string} data.recipientPublicKey
   * @param {number} data.lockTime
   * @param {object} expected
   * @param {number} expected.value
   * @param {number} expected.lockTime
   * @param {string} expected.recipientPublicKey
   * @returns {Promise.<string>}
   */
  async checkScript(data, expected, hashName) {
    const { recipientPublicKey, lockTime } = data
    const { scriptAddress, script } = this.createScript(data, hashName)

    const expectedConfidence = expected.confidence || 0.95
    const unspents      = await this.fetchUnspents(scriptAddress)
    const expectedValue = expected.value.multipliedBy(1e8).integerValue()
    const totalUnspent  = unspents.reduce((summ, { satoshis }) => summ + satoshis, 0)

    const confidentUnspents = await this.filterConfidentUnspents(unspents, expectedConfidence)
    const totalConfidentUnspent = confidentUnspents.reduce((summ, { satoshis }) => summ + satoshis, 0)

    if (expectedValue.isGreaterThan(totalUnspent)) {
      return `Expected script value: ${expectedValue.toNumber()}, got: ${totalUnspent}, address: ${scriptAddress}`
    }
    if (expected.lockTime > lockTime) {
      return `Expected script lockTime: ${expected.lockTime}, got: ${lockTime}, address: ${scriptAddress}`
    }
    if (expected.recipientPublicKey !== recipientPublicKey) {
      return `Expected script recipient publicKey: ${expected.recipientPublicKey}, got: ${recipientPublicKey}`
    }
    if (expectedValue.isGreaterThan(totalConfidentUnspent)) {
      return `Expected script value: ${expectedValue.toString()} with confidence above ${expectedConfidence}, got: ${totalConfidentUnspent}, address: ${scriptAddress}`
    }
  }

  /**
   *
   * @param {object} data
   * @param {object} data.scriptValues
   * @param {BigNumber} data.amount
   * @param {function} handleTransactionHash
   * @param {string} hashName
   * @returns {Promise}
   */
  fundScript(data, handleTransactionHash, hashName) {
    const { scriptValues, amount } = data

    return new Promise(async (resolve, reject) => {
      try {
        const { scriptAddress } = this.createScript(scriptValues, hashName)
        const ownerAddress = this.app.services.auth.accounts.bch.getAddress()

        const tx            = new this.app.env.bitcoincash.TransactionBuilder(this.network)
        const unspents      = await this.fetchUnspents(ownerAddress)

        const fundValue     = amount.multipliedBy(1e8).integerValue().toNumber()
        const feeValueBN    = await this.getTxFee({ inSatoshis: true, address: ownerAddress })
        const feeValue      = feeValueBN.integerValue().toNumber()
        const totalUnspent  = unspents.reduce((summ, { satoshis }) => summ + satoshis, 0)
        const skipValue     = totalUnspent - fundValue - feeValue

        if (totalUnspent < feeValue + fundValue) {
          throw new Error(`Total less than fee: ${totalUnspent} < ${feeValue} + ${fundValue}`)
        }

        unspents.forEach(({ txid, vout }) => tx.addInput(txid, vout))
        tx.addOutput(this.app.env.bchaddr.toLegacyAddress(scriptAddress), fundValue)
        tx.addOutput(this.app.env.bchaddr.toLegacyAddress(ownerAddress), skipValue)
        tx.inputs.forEach((input, index) => {
          const amount = unspents[index].satoshis
          tx.sign(
            index,
            this.app.services.auth.accounts.bch,
            null,
            this.app.env.bitcoincash.Transaction.SIGHASH_ALL,
            amount,
            null,
          )
        })

        const txRaw = tx.buildIncomplete()

        if (typeof handleTransactionHash === 'function') {
          handleTransactionHash(txRaw.getId())
        }

        try {
          const result = await this.broadcastTx(txRaw.toHex())

          resolve(result)
        }
        catch (err) {
          reject(err)
        }
      }
      catch (err) {
        reject(err)
      }
    })
  }

  /**
   *
   * @param {object|string} data - scriptValues or wallet address
   * @returns {Promise.<void>}
   */
  async getBalance(data, hashName) {
    let address

    if (typeof data === 'string') {
      address = data
    }
    else if (typeof data === 'object') {
      const { scriptAddress } = this.createScript(data, hashName)

      address = scriptAddress
    }
    else {
      throw new Error('Wrong data type')
    }

    const unspents      = await this.fetchUnspents(address)
    const totalUnspent  = unspents && unspents.length && unspents.reduce((summ, { satoshis }) => summ + satoshis, 0) || 0

    return totalUnspent
  }

  /**
   *
   * @param {object} data
   * @param {object} data.scriptValues
   * @param {string} data.secret
   * @param {boolean} isRefund
   * @returns {Promise}
   */
  async getWithdrawRawTransaction(data, isRefund, hashName) {
    const { scriptValues, secret } = data

    const { script, scriptAddress } = this.createScript(scriptValues, hashName)
    const ownerAddress = this.app.services.auth.accounts.bch.getAddress()

    const { destinationAddress } = data

    const tx            = new this.app.env.bitcoincash.TransactionBuilder(this.network)
    const unspents      = await this.fetchUnspents(scriptAddress)
    const feeValueBN    = await this.getTxFee({ inSatoshis: true, address: scriptAddress })
    const feeValue      = feeValueBN.integerValue().toNumber()
    const totalUnspent  = unspents.reduce((summ, { satoshis }) => summ + satoshis, 0)
    const skipValue     = totalUnspent - feeValue

    if (BigNumber(totalUnspent).isLessThan(feeValue)) {
      throw new Error(`Total less than fee: ${totalUnspent} < ${feeValue}`)
    }

    if (isRefund) {
      tx.setLockTime(scriptValues.lockTime)
    }

    unspents.forEach(({ txid, vout }) => tx.addInput(txid, vout, 0xfffffffe))
    tx.addOutput(this.app.env.bchaddr.toLegacyAddress(destinationAddress || ownerAddress), skipValue)

    const txRaw = tx.buildIncomplete()

    unspents.map((item, index) =>
      this._signTransaction({
        script,
        secret,
        txRaw,
        value: item.satoshis,
      }, index)
    )

    return txRaw
  }

  /**
   *
   * @param {object} data
   * @param {object} data.scriptValues
   * @param {string} data.secret
   * @param {boolean} isRefund
   * @returns {Promise}
   */
  async getWithdrawHexTransaction(data, isRefund) {
    const txRaw = await this.getWithdrawRawTransaction(data, isRefund)

    return txRaw.toHex()
  }

  /**
   *
   * @param {object} data
   * @param {object} data.scriptValues
   * @param {string} data.secret
   * @returns {Promise}
   */
  getRefundRawTransaction(data) {
    return this.getWithdrawRawTransaction(data, true)
  }

  /**
   *
   * @param {object} data
   * @param {object} data.scriptValues
   * @param {string} data.secret
   * @returns {Promise}
   */
  async getRefundHexTransaction(data) {
    const txRaw = await this.getRefundRawTransaction(data)

    return txRaw.toHex()
  }

  /**
   *
   * @param {object} data
   * @param {object} data.scriptValues
   * @param {string} data.secret
   * @param {function} handleTransactionHash
   * @param {boolean} isRefund
   * @param {string} hashName
   * @returns {Promise}
   */
  withdraw(data, handleTransactionHash, isRefund, hashName) {
    return new Promise(async (resolve, reject) => {
      try {
        const txRaw = await this.getWithdrawRawTransaction(data, isRefund, hashName)
        debug('swap.core:swaps')('raw tx withdraw', txRaw.toHex())

        if (typeof handleTransactionHash === 'function') {
          handleTransactionHash(txRaw.getId())
        }
        console.warn('txRaw', txRaw.toHex())
        const result = await this.broadcastTx(txRaw.toHex())

        resolve(result)
      }
      catch (err) {
        reject(err)
      }
    })
  }

  /**
   *
   * @param {object} data
   * @param {object} data.scriptValues
   * @param {string} data.secret
   * @param {function} handleTransactionHash
   * @returns {Promise}
   */
  refund(data, handleTransactionHash) {
    return this.withdraw(data, handleTransactionHash, true)
  }
}


export default BchSwap
