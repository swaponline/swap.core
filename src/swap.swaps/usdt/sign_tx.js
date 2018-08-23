const bitcoin = require('bitcoinjs-lib')
const net = process.env.NETWORK === 'testnet'
  ? bitcoin.networks.testnet
  : bitcoin.networks.bitcoin

/**
 *
 * @param {*} txRaw
 * @param {object} data
 * @param {object} data.script
 * @param {string} data.secret
 * @private
 */
const signTransaction = (txRaw, data) => {
  const { script, secret, key } = data
  // txRaw.sign(0, key, script)
  // return

  const hashType      = bitcoin.Transaction.SIGHASH_ALL
  const signatureHash = txRaw.hashForSignature(0, script, hashType)
  const signature     = key.sign(signatureHash).toScriptSignature(hashType)

  const scriptSig = bitcoin.script.scriptHash.input.encode(
    [
      signature,
      key.getPublicKeyBuffer(),
      Buffer.from(secret.replace(/^0x/, ''), 'hex'),
    ],
    script,
  )

  // const scriptSig = bitcoin.script.compile(
  //   [
  //     signature,
  //     key.getPublicKeyBuffer(),
  //     Buffer.from(secret.replace(/^0x/, ''), 'hex'),
  //   ],
  //   script,
  // )

  console.log('signature', signature.toString("hex"))
  console.log('secret', secret)
  console.log('key', key.getPublicKeyBuffer().toString("hex"))

  txRaw.setInputScript(0, scriptSig)
  // txRaw.sign(0, key, script)
}


module.exports = signTransaction
