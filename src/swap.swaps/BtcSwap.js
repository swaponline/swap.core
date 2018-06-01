import SwapCore from '../swap.core'


const utcNow = () => Math.floor(Date.now() / 1000)
const getLockTime = () => utcNow() + 3600 * 3 // 3 days from now

class BtcSwap {

  /**
   *
   * @param options
   * @param options.fetchBalance
   * @param options.fetchUnspents
   * @param options.broadcastTx
   */
  constructor(options) {
    if (typeof options.fetchBalance !== 'function') {
      throw new Error('EthSwap: "fetchBalance" required')
    }
    if (typeof options.fetchUnspents !== 'function') {
      throw new Error('EthSwap: "fetchUnspents" required')
    }
    if (typeof options.broadcastTx !== 'function') {
      throw new Error('EthSwap: "broadcastTx" required')
    }

    this._name          = 'btcSwap'
    this.fetchBalance   = options.fetchUnspents
    this.fetchUnspents  = options.fetchUnspents
    this.broadcastTx    = options.broadcastTx
  }

  createScript({ secretHash, btcOwnerPublicKey, ethOwnerPublicKey, lockTime: _lockTime }) {
    const lockTime = _lockTime || getLockTime()

    console.log('\n\nCreate BTC Swap Script', { secretHash, btcOwnerPublicKey, ethOwnerPublicKey, lockTime })

    // const script = SwapCore.env.bitcoin.script.compile([
    //   SwapCore.env.bitcoin.opcodes.OP_RIPEMD160,
    //   Buffer.from(secretHash, 'hex'),
    //   SwapCore.env.bitcoin.opcodes.OP_EQUALVERIFY,
    //   Buffer.from(ethOwnerPublicKey, 'hex'),
    //   SwapCore.env.bitcoin.opcodes.OP_CHECKSIG,
    // ])

    const script = SwapCore.env.bitcoin.script.compile([
      SwapCore.env.bitcoin.opcodes.OP_RIPEMD160,
      Buffer.from(secretHash, 'hex'),
      SwapCore.env.bitcoin.opcodes.OP_EQUALVERIFY,

      Buffer.from(ethOwnerPublicKey, 'hex'),
      SwapCore.env.bitcoin.opcodes.OP_EQUAL,
      SwapCore.env.bitcoin.opcodes.OP_IF,

      Buffer.from(ethOwnerPublicKey, 'hex'),
      SwapCore.env.bitcoin.opcodes.OP_CHECKSIG,

      SwapCore.env.bitcoin.opcodes.OP_ELSE,

      SwapCore.env.bitcoin.script.number.encode(lockTime),
      SwapCore.env.bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
      SwapCore.env.bitcoin.opcodes.OP_DROP,
      Buffer.from(btcOwnerPublicKey, 'hex'),
      SwapCore.env.bitcoin.opcodes.OP_CHECKSIG,

      SwapCore.env.bitcoin.opcodes.OP_ENDIF,
    ])

    const scriptPubKey  = SwapCore.env.bitcoin.script.scriptHash.output.encode(SwapCore.env.bitcoin.crypto.hash160(script))
    const scriptAddress = SwapCore.env.bitcoin.address.fromOutputScript(scriptPubKey, SwapCore.env.bitcoin.networks.testnet)

    return {
      address: scriptAddress,
      script,
      secretHash,
      btcOwnerPublicKey,
      ethOwnerPublicKey,
      lockTime,
    }
  }

  fundScript({ script, amount }) {
    return new Promise(async (resolve, reject) => {
      // const script        = hexStringToByte(scriptHash)
      try {
        const scriptPubKey  = SwapCore.env.bitcoin.script.scriptHash.output.encode(SwapCore.env.bitcoin.crypto.hash160(script))
        const scriptAddress = SwapCore.env.bitcoin.address.fromOutputScript(scriptPubKey, SwapCore.env.bitcoin.networks.testnet)

        const tx            = new SwapCore.env.bitcoin.TransactionBuilder(SwapCore.env.bitcoin.networks.testnet)
        const unspents      = await this.fetchUnspents(SwapCore.services.auth.btc.getAddress())

        const fundValue     = Math.floor(Number(amount) * 1e8)
        const feeValue      = 15000 // TODO how to get this value
        const totalUnspent  = unspents.reduce((summ, { satoshis }) => summ + satoshis, 0)
        const skipValue     = totalUnspent - fundValue - feeValue

        console.log('\n-----------------------------------\n\n')
        console.log('fundValue', fundValue)
        console.log('feeValue', feeValue)
        console.log('totalUnspent', totalUnspent)
        console.log('skipValue', skipValue)
        console.log('\n-----------------------------------\n\n')

        unspents.forEach(({ txid, vout }) => {
          tx.addInput(txid, vout)
        })
        tx.addOutput(scriptAddress, fundValue)
        tx.addOutput(SwapCore.services.auth.btc.getAddress(), skipValue)
        tx.inputs.forEach((input, index) => {
          tx.sign(index, SwapCore.services.auth.btc)
        })

        const txRaw     = tx.buildIncomplete()
        const txRawHex  = txRaw.toHex()

        console.log('\nFund BTC Swap Script', {
          script,
          scriptAddress,
          totalUnspent,
          amount,
          fundValue,
          feeValue,
          skipValue,
          tx,
          txRawHex,
        })

        let result

        try {
          result = await this.broadcastTx(txRawHex)
        }
        catch (err) {
          reject(err)
        }

        resolve(result)
      }
      catch (err) {
        reject(err)
      }
    })
  }

  withdraw({ script, secret }) {
    console.log('\n\nWithdraw money from BTC Swap Script', { script, secret })

    return new Promise(async (resolve, reject) => {
      try {
        const scriptPubKey  = SwapCore.env.bitcoin.script.scriptHash.output.encode(SwapCore.env.bitcoin.crypto.hash160(script))
        const scriptAddress = SwapCore.env.bitcoin.address.fromOutputScript(scriptPubKey, SwapCore.env.bitcoin.networks.testnet)

        const hashType      = SwapCore.env.bitcoin.Transaction.SIGHASH_ALL
        const tx            = new SwapCore.env.bitcoin.TransactionBuilder(SwapCore.env.bitcoin.networks.testnet)

        const unspents      = await this.fetchUnspents(scriptAddress)

        const feeValue      = 15000 // TODO how to get this value
        const totalUnspent  = unspents.reduce((summ, { satoshis }) => summ + satoshis, 0)

        unspents.forEach(({ txid, vout }) => {
          console.log('Add input from unspents:', txid, vout)
          tx.addInput(txid, vout, 0xfffffffe)
        })
        tx.addOutput(SwapCore.services.auth.btc.getAddress(), totalUnspent - feeValue)

        console.log('Data:', {
          self: this,
          scriptAddress,
          totalUnspent,
          feeValue,
        })

        const txRaw               = tx.buildIncomplete()
        const signatureHash       = txRaw.hashForSignature(0, script, hashType)
        const signature           = SwapCore.services.auth.btc.sign(signatureHash).toScriptSignature(hashType)

        const scriptSig = SwapCore.env.bitcoin.script.scriptHash.input.encode(
          [
            signature,
            SwapCore.services.auth.btc.getPublicKeyBuffer(),
            Buffer.from(secret.replace(/^0x/, ''), 'hex'),
          ],
          script,
        )

        txRaw.setInputScript(0, scriptSig)

        const txId      = txRaw.getId()
        const txRawHex  = txRaw.toHex()

        console.log('txId', txId)
        console.log('txRawHex', txRawHex)

        const result = await this.broadcastTx(txRawHex)

        resolve(result)
      }
      catch (err) {
        reject(err)
      }
    })
  }

  refund({ script, lockTime, secret }, handleTransactionHash) {
    console.log('\n\nRefund money from BTC Swap Script')

    return new Promise(async (resolve, reject) => {
      try {
        const scriptPubKey  = SwapCore.env.bitcoin.script.scriptHash.output.encode(SwapCore.env.bitcoin.crypto.hash160(script))
        const scriptAddress = SwapCore.env.bitcoin.address.fromOutputScript(scriptPubKey, SwapCore.env.bitcoin.networks.testnet)

        const hashType      = SwapCore.env.bitcoin.Transaction.SIGHASH_ALL
        const tx            = new SwapCore.env.bitcoin.TransactionBuilder(SwapCore.env.bitcoin.networks.testnet)

        const unspents      = await this.fetchUnspents(scriptAddress)

        const feeValue      = 4e5
        const totalUnspent  = unspents.reduce((summ, { satoshis }) => summ + satoshis, 0)

        tx.setLockTime(lockTime)
        unspents.forEach(({ txid, vout }) => {
          tx.addInput(txid, vout, 0xfffffffe)
        })
        tx.addOutput(SwapCore.services.auth.btc.getAddress(), totalUnspent - feeValue)

        const txRaw               = tx.buildIncomplete()
        const signatureHash       = txRaw.hashForSignature(0, script, hashType)
        const signature           = SwapCore.services.auth.btc.sign(signatureHash).toScriptSignature(hashType)

        const scriptSig = SwapCore.env.bitcoin.script.scriptHash.input.encode(
          [
            signature,
            SwapCore.services.auth.btc.getPublicKeyBuffer(),
            Buffer.from(secret, 'hex'),
          ],
          script,
        )

        txRaw.setInputScript(0, scriptSig)

        const txId      = txRaw.getId()
        const txRawHex  = txRaw.toHex()

        console.log('txId', txId)
        console.log('txRawHex', txRawHex)

        const result = await this.broadcastTx(txRawHex)

        handleTransactionHash && handleTransactionHash(txId)
        resolve(result)
      }
      catch (err) {
        reject(err)
      }
    })
  }
}


export default BtcSwap
