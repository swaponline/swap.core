const utcNow = () => Math.floor(Date.now() / 1000)
const getLockTime = () => utcNow() + 3600 * 3 // 3 days from now

class BtcSwap {

  constructor({ lib, account, fetchUnspents, broadcastTx }) {
    this.bitcoinJsLib   = lib
    this.account        = account
    this.address        = account.getAddress()
    this.fetchUnspents  = fetchUnspents
    this.broadcastTx    = broadcastTx
  }

  createScript({ secretHash, btcOwnerPublicKey, ethOwnerPublicKey, lockTime: _lockTime }) {
    const lockTime = _lockTime || getLockTime()

    console.log('\n\nCreate BTC Swap Script', { secretHash, btcOwnerPublicKey, ethOwnerPublicKey, lockTime })

    // const script = this.bitcoinJsLib.script.compile([
    //   this.bitcoinJsLib.opcodes.OP_RIPEMD160,
    //   Buffer.from(secretHash, 'hex'),
    //   this.bitcoinJsLib.opcodes.OP_EQUALVERIFY,
    //   Buffer.from(ethOwnerPublicKey, 'hex'),
    //   this.bitcoinJsLib.opcodes.OP_CHECKSIG,
    // ])

    const script = this.bitcoinJsLib.script.compile([
      this.bitcoinJsLib.opcodes.OP_RIPEMD160,
      Buffer.from(secretHash, 'hex'),
      this.bitcoinJsLib.opcodes.OP_EQUALVERIFY,

      Buffer.from(ethOwnerPublicKey, 'hex'),
      this.bitcoinJsLib.opcodes.OP_EQUAL,
      this.bitcoinJsLib.opcodes.OP_IF,

      Buffer.from(ethOwnerPublicKey, 'hex'),
      this.bitcoinJsLib.opcodes.OP_CHECKSIG,

      this.bitcoinJsLib.opcodes.OP_ELSE,

      this.bitcoinJsLib.script.number.encode(lockTime),
      this.bitcoinJsLib.opcodes.OP_CHECKLOCKTIMEVERIFY,
      this.bitcoinJsLib.opcodes.OP_DROP,
      Buffer.from(btcOwnerPublicKey, 'hex'),
      this.bitcoinJsLib.opcodes.OP_CHECKSIG,

      this.bitcoinJsLib.opcodes.OP_ENDIF,
    ])

    const scriptPubKey  = this.bitcoinJsLib.script.scriptHash.output.encode(this.bitcoinJsLib.crypto.hash160(script))
    const scriptAddress = this.bitcoinJsLib.address.fromOutputScript(scriptPubKey, this.bitcoinJsLib.networks.testnet)

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
        const scriptPubKey  = this.bitcoinJsLib.script.scriptHash.output.encode(this.bitcoinJsLib.crypto.hash160(script))
        const scriptAddress = this.bitcoinJsLib.address.fromOutputScript(scriptPubKey, this.bitcoinJsLib.networks.testnet)

        const tx            = new this.bitcoinJsLib.TransactionBuilder(this.bitcoinJsLib.networks.testnet)
        const unspents      = await this.fetchUnspents(this.address)

        const fundValue     = Math.floor(Number(amount) * 1e8)
        const feeValue      = 4e3 // TODO how to get this value
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
        tx.addOutput(this.address, skipValue)
        tx.inputs.forEach((input, index) => {
          tx.sign(index, this.account)
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
    console.log('\n\nWithdraw money from BTC Swap Script', { secret })

    return new Promise(async (resolve, reject) => {
      try {
        const scriptPubKey  = this.bitcoinJsLib.script.scriptHash.output.encode(this.bitcoinJsLib.crypto.hash160(script))
        const scriptAddress = this.bitcoinJsLib.address.fromOutputScript(scriptPubKey, this.bitcoinJsLib.networks.testnet)

        const hashType      = this.bitcoinJsLib.Transaction.SIGHASH_ALL
        const tx            = new this.bitcoinJsLib.TransactionBuilder(this.bitcoinJsLib.networks.testnet)

        const unspents      = await this.fetchUnspents(scriptAddress)

        const feeValue      = 4e5
        const totalUnspent  = unspents.reduce((summ, { satoshis }) => summ + satoshis, 0)

        unspents.forEach(({ txid, vout }) => {
          tx.addInput(txid, vout, 0xfffffffe)
        })
        tx.addOutput(this.address, totalUnspent - feeValue)

        const txRaw               = tx.buildIncomplete()
        const signatureHash       = txRaw.hashForSignature(0, script, hashType)
        const signature           = this.account.sign(signatureHash).toScriptSignature(hashType)

        const scriptSig = this.bitcoinJsLib.script.scriptHash.input.encode(
          [
            signature,
            this.account.getPublicKeyBuffer(),
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
        const scriptPubKey  = this.bitcoinJsLib.script.scriptHash.output.encode(this.bitcoinJsLib.crypto.hash160(script))
        const scriptAddress = this.bitcoinJsLib.address.fromOutputScript(scriptPubKey, this.bitcoinJsLib.networks.testnet)

        const hashType      = this.bitcoinJsLib.Transaction.SIGHASH_ALL
        const tx            = new this.bitcoinJsLib.TransactionBuilder(this.bitcoinJsLib.networks.testnet)

        const unspents      = await this.fetchUnspents(scriptAddress)

        const feeValue      = 4e5
        const totalUnspent  = unspents.reduce((summ, { satoshis }) => summ + satoshis, 0)

        tx.setLockTime(lockTime)
        unspents.forEach(({ txid, vout }) => {
          tx.addInput(txid, vout, 0xfffffffe)
        })
        tx.addOutput(this.address, totalUnspent - feeValue)

        const txRaw               = tx.buildIncomplete()
        const signatureHash       = txRaw.hashForSignature(0, script, hashType)
        const signature           = this.account.sign(signatureHash).toScriptSignature(hashType)

        const scriptSig = this.bitcoinJsLib.script.scriptHash.input.encode(
          [
            signature,
            this.account.getPublicKeyBuffer(),
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
