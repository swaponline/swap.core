const bitcoin = require('bitcoinjs-lib')
const net = process.env.NETWORK === 'testnet'
  ? bitcoin.networks.testnet
  : bitcoin.networks.bitcoin

module.exports = (publicKey) => {
  const publicKeyHash = bitcoin.crypto.hash160(publicKey)

  return bitcoin.address.toBase58Check(publicKeyHash, net.pubKeyHash)
}
