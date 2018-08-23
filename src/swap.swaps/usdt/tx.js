const bitcoin = require('bitcoinjs-lib')
const net = process.env.NETWORK === 'testnet'
  ? bitcoin.networks.testnet
  : bitcoin.networks.bitcoin

const getUnspents = require('./unspents')

module.exports = async (from, to, amount) => {
  const tx = new bitcoin.TransactionBuilder(net)

  const { unspents, totalUnspent } = await getUnspents(from.getAddress())

  const fundValue = amount
  const feeValue  = 1000
  const skipValue = totalUnspent - fundValue - feeValue

  if (totalUnspent < feeValue + fundValue) {
    throw new Error(`Total less than fee: ${totalUnspent} < ${feeValue} + ${fundValue}`)
  }

  const inputs = unspents

  inputs.forEach(({ txid, vout }) => tx.addInput(txid, vout, 0xfffffffe))

  // outputs = simple send
  tx.addOutput(to.getAddress(), fundValue)

  if (skipValue) {
    tx.addOutput(from.getAddress(), skipValue)
  }

  // signing
  tx.inputs.forEach((input, index) => {
    tx.sign(index, from)
  })

  return tx
}
