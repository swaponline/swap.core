import SwapApp, { SwapInterface, constants } from 'swap.app'

const FEE_VALUE = 2000 // satoshis TODO how to get this value
const DUST = 546

const createOmniSimpleSend = require('./usdt/omni_script')
const createScript = require('./usdt/swap_script')
const createFundingTransaction = require('./usdt/funding_tx')
const createRedeemTransaction = require('./usdt/redeem_tx')

class UsdtSwap extends SwapInterface {

  /**
   *
   * @param options
   * @param options.fetchBalance
   * @param options.fetchUnspents
   * @param options.broadcastTx
   */
  constructor(options) {
    super()

    if (typeof options.fetchBalance !== 'function') {
      throw new Error('UsdtSwap: "fetchBalance" required')
    }
    if (typeof options.fetchUnspents !== 'function') {
      throw new Error('UsdtSwap: "fetchUnspents" required')
    }
    if (typeof options.broadcastTx !== 'function') {
      throw new Error('UsdtSwap: "broadcastTx" required')
    }

    this._swapName      = constants.COINS.usdt
    this.fetchBalance   = options.fetchBalance
    this.fetchUnspents  = options.fetchUnspents
    this.broadcastTx    = options.broadcastTx
  }

  _initSwap() {
    this.network = (
      SwapApp.isMainNet()
        ? SwapApp.env.bitcoin.networks.bitcoin
        : SwapApp.env.bitcoin.networks.testnet
    )

    if (!SwapApp.isMainNet()) {
      throw new Error(`Sorry, USDT does not yet works on testnet!`)
    }
  }

  /**
   *
   * @param {object} data
   * @param {object} data.script
   * @param {*} data.txRaw
   * @param {string} data.secret
   * @private
   */
  _signTransaction(data, inputIndex = 0) {
    const { script, txRaw, secret } = data

    const hashType      = SwapApp.env.bitcoin.Transaction.SIGHASH_ALL
    const signatureHash = txRaw.hashForSignature(inputIndex, script, hashType)
    const signature     = SwapApp.services.auth.accounts.btc.sign(signatureHash).toScriptSignature(hashType)

    const scriptSig = SwapApp.env.bitcoin.script.scriptHash.input.encode(
      [
        signature,
        SwapApp.services.auth.accounts.btc.getPublicKeyBuffer(),
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
  createScript(data) {
    const { secretHash, ownerPublicKey, recipientPublicKey, lockTime } = data

    console.log('DATA', data)

    const script = SwapApp.env.bitcoin.script.compile([

      SwapApp.env.bitcoin.opcodes.OP_RIPEMD160,
      Buffer.from(secretHash, 'hex'),
      SwapApp.env.bitcoin.opcodes.OP_EQUALVERIFY,

      Buffer.from(recipientPublicKey, 'hex'),
      SwapApp.env.bitcoin.opcodes.OP_EQUAL,
      SwapApp.env.bitcoin.opcodes.OP_IF,

      Buffer.from(recipientPublicKey, 'hex'),
      SwapApp.env.bitcoin.opcodes.OP_CHECKSIG,

      SwapApp.env.bitcoin.opcodes.OP_ELSE,

      SwapApp.env.bitcoin.script.number.encode(lockTime),
      SwapApp.env.bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
      SwapApp.env.bitcoin.opcodes.OP_DROP,
      Buffer.from(ownerPublicKey, 'hex'),
      SwapApp.env.bitcoin.opcodes.OP_CHECKSIG,

      SwapApp.env.bitcoin.opcodes.OP_ENDIF,
    ])

    const scriptPubKey  = SwapApp.env.bitcoin.script.scriptHash.output.encode(SwapApp.env.bitcoin.crypto.hash160(script))
    const scriptAddress = SwapApp.env.bitcoin.address.fromOutputScript(scriptPubKey, this.network)

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
  async checkScript(data, expected) {
    const { redeemHex, scriptValues, fundingTxHash } = data

    const { secretHash, ownerPublicKey, recipientPublicKey, lockTime } = scriptValues
    const { scriptAddress, script } = createScript(secretHash, ownerPublicKey, recipientPublicKey, lockTime)

    const fundingValues = {
      txid: fundingTxHash,
      scriptAddress,
    }

    // const { scriptValues, fundingValues, amount } = data
    // const hex = this.buildRawRedeemTransaction({ amount: expected.amount, scriptValues, fundingValues })

    // console.log('should be', hex)
    console.log('tx hex', redeemHex)

    const txb = SwapApp.env.bitcoin.TransactionBuilder.fromTransaction(
        SwapApp.env.bitcoin.Transaction.fromHex(redeemHex))

    // expect(txb.inputs.length).toBe(2)
    // // expect(txb.outputs.length).toBe(3)
    // expect(txb.tx.outs.length).toBe(3)

    console.dir('txb outs', txb.tx.outs)

    // const pubKey = SwapApp.env.bitcoin.ECPair.fromPublicKeyBuffer(Buffer.from(_ORDER.participant.btc.publicKey, 'hex'))
    const expectedP2PKHOutputScript = SwapApp.env.bitcoin.address.toOutputScript(SwapApp.services.auth.accounts.btc.getAddress())

    const expectedOmniOutput = createOmniSimpleSend(expected.amount)

    console.log('expectedOmniOutput', expectedOmniOutput)
    console.log('expectedOmniOutput', txb.tx.outs[0].script)

    console.log('expectedP2PKHOutput', expectedP2PKHOutputScript)
    console.log('expectedP2PKHOutput', txb.tx.outs[1].script)

    if (!expectedOmniOutput.equals(txb.tx.outs[0].script)) {
      return `Expected first output value: `
      + SwapApp.env.bitcoin.script.toASM(expectedOmniOutput)
      + `, got: `
      + SwapApp.env.bitcoin.script.toASM(txb.tx.outs[0].script)
    }
    if (!expectedP2PKHOutputScript.equals(txb.tx.outs[1].script)) {
      return `Expected second output value: `
      + SwapApp.env.bitcoin.script.toASM(expectedP2PKHOutputScript)
      + `, got: `
      + SwapApp.env.bitcoin.script.toASM(txb.tx.outs[1].script)
    }
    if (expected.lockTime > lockTime) {
      return `Expected script lockTime: ${expected.lockTime}, got: ${lockTime}`
    }
    if (expected.recipientPublicKey !== recipientPublicKey) {
      return `Expected script recipient publicKey: ${expected.recipientPublicKey}, got: ${recipientPublicKey}`
    }

    // const unspents      = await this.fetchUnspents(scriptAddress)
    // const totalUnspent  = unspents.reduce((summ, { satoshis }) => summ + satoshis, 0)
    // const expectedValue = 546
    //
    // // if (expectedValue.isGreaterThan(totalUnspent)) {
    // //   return `Expected script value: ${expectedValue.toNumber()}, got: ${totalUnspent}`
    // // }
    if (expected.lockTime > lockTime) {
      return `Expected script lockTime: ${expected.lockTime}, got: ${lockTime}`
    }
    // if (expected.recipientPublicKey !== recipientPublicKey) {
    //   return `Expected script recipient publicKey: ${expected.recipientPublicKey}, got: ${recipientPublicKey}`
    // }
  }

  /**
   *
   * @param {object} data
   * @param {object} data.scriptValues
   * @param {BigNumber} data.amount
   * @param {function} handleTransactionHash
   * @returns {Promise}
   */
   fundScript(data, handleTransactionHash) {
    const { scriptValues } = data

    return new Promise(async (resolve, reject) => {
      try {
        const { ownerPublicKey, recipientPublicKey } = scriptValues

        const dialog = {
          owner: SwapApp.services.auth.accounts.btc,
          party: Buffer.from(recipientPublicKey, 'hex')
        }

        const funding = await createFundingTransaction(dialog, scriptValues, this.fetchUnspents, this.network)

        if (typeof handleTransactionHash === 'function') {
          const txRaw = funding.tx.buildIncomplete()
          handleTransactionHash(txRaw.getId(), funding)
        }

        try {
          const result = await this.broadcastTx(funding.hex)

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

  buildRawRedeemTransaction(data) {
    const { scriptValues, fundingValues, amount } = data

    return new Promise(async (resolve, reject) => {
      try {
        const { ownerPublicKey, recipientPublicKey } = scriptValues

        const dialog = {
          owner: SwapApp.services.auth.accounts.btc,
          party: Buffer.from(recipientPublicKey, 'hex')
        }

        const omniScriptValues = {
          ...fundingValues,
          ...scriptValues,
        }

        const redeem_tx = await createRedeemTransaction(dialog, omniScriptValues, amount, this.fetchUnspents, this.network)

        try {
          const result = redeem_tx.buildIncomplete().toHex()

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

  redeemScript(data, handleTransactionHash) {
    const { usdtRawRedeemTransactionHex: redeemHex, secret, scriptValues } = data

    return new Promise(async (resolve, reject) => {
      try {
        const { secretHash, lockTime: locktime } = scriptValues
        const { ownerPublicKey, recipientPublicKey } = scriptValues

        const txb = SwapApp.env.bitcoin.TransactionBuilder.fromTransaction(
            SwapApp.env.bitcoin.Transaction.fromHex(redeemHex))

        const { script, scriptAddress: addr } = createScript(
          secretHash,
          ownerPublicKey,
          recipientPublicKey,
          locktime)

        console.log('script address', addr)

        const forSigning = {
          txRaw: txb.buildIncomplete(),
          script,
          secret,
        }

        this._signTransaction(forSigning, 1)

        const tx = txb.build()

        console.log('redeem tx hash', tx.getId())
        console.log(`redeem tx hex ${tx.toHex()}`)

        if (typeof handleTransactionHash === 'function') {
          handleTransactionHash(tx.getId())
        }

        try {
          const result = await this.broadcastTx(tx.toHex())

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

  getRedeemTransaction(data) {
    const { redeemHex, secret, scriptValues } = data

    const { secretHash, lockTime: locktime } = scriptValues
    const { ownerPublicKey, recipientPublicKey } = scriptValues

    const txb = SwapApp.env.bitcoin.TransactionBuilder.fromTransaction(
        SwapApp.env.bitcoin.Transaction.fromHex(redeemHex))

    const { script, scriptAddress: addr } = createScript(
      secretHash,
      ownerPublicKey,
      recipientPublicKey,
      locktime)

    console.log('script address', addr)

    const txRaw = txb.buildIncomplete()

    const forSigning = {
      txRaw,
      script,
      secret,
    }

    this._signTransaction(forSigning, 1)

    return txRaw
  }

  /**
   *
   * @param {object|string} data - scriptValues or wallet address
   * @returns {Promise.<void>}
   */
  async getBalance(data) {
    let address

    if (typeof data === 'string') {
      address = data
    }
    else if (typeof data === 'object') {
      const { scriptAddress } = this.createScript(data)

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
  async getWithdrawRawTransaction(data, isRefund) {
    const { scriptValues, secret } = data

    const { script, scriptAddress } = this.createScript(scriptValues)

    const tx            = new SwapApp.env.bitcoin.TransactionBuilder(this.network)
    const unspents      = await this.fetchUnspents(scriptAddress)
    const feeValue      = FEE_VALUE
    const totalUnspent  = unspents.reduce((summ, { satoshis }) => summ + satoshis, 0)

    if (totalUnspent < feeValue) {
      throw new Error(`Total less than fee: ${totalUnspent} < ${feeValue}`)
    }

    if (isRefund) {
      tx.setLockTime(scriptValues.lockTime)
    }

    unspents.forEach(({ txid, vout }) => tx.addInput(txid, vout, 0xfffffffe))
    tx.addOutput(SwapApp.services.auth.accounts.btc.getAddress(), totalUnspent - feeValue)

    const txRaw = tx.buildIncomplete()

    this._signTransaction({
      script,
      secret,
      txRaw,
    })

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
   * @returns {Promise}
   */
  withdraw(data, handleTransactionHash, isRefund) {
    return new Promise(async (resolve, reject) => {
      try {
        const txRaw = await this.getRedeemTransaction(data)

        if (typeof handleTransactionHash === 'function') {
          handleTransactionHash(txRaw.getId())
        }

        console.log('txRaw', txRaw)
        const result = await this.broadcastTx(txRaw.toHex())
        console.log('txRaw', result)

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


export default UsdtSwap
