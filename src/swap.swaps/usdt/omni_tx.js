const bitcoin = require('bitcoinjs-lib')
const net = process.env.NETWORK === 'testnet'
  ? bitcoin.networks.testnet
  : bitcoin.networks.bitcoin

const createSimpleSend = async (fetchUnspents, alice_pair, recipient_address, amount) => {

  const tx = new bitcoin.TransactionBuilder(net)

  const alice_p2pkh = alice_pair.getAddress()
  const unspents = await fetchUnspents(alice_p2pkh)
  const UTXO = unspents // { txid, vout, satoshis }

  const fundValue     = 546 // dust
  const feeValue      = 1000
  const totalUnspent  = unspents.reduce((summ, { satoshis }) => summ + satoshis, 0)
  const skipValue     = totalUnspent - fundValue - feeValue

  if (totalUnspent < feeValue + fundValue) {
    throw new Error(`Total less than fee: ${totalUnspent} < ${feeValue} + ${fundValue}`)
  }

  unspents.forEach(({ txid, vout }) => tx.addInput(txid, vout, 0xfffffffe))

  const simple_send = [
    "6f6d6e69", // omni
    "0000",     // version
    "00000000001f", // 31 for Tether
    "000000003B9ACA00" // amount = 10 * 100 000 000 in HEX
  ].join('')

  const data = Buffer.from(simple_send, "hex")

  const omniOutput = bitcoin.script.compile([
    bitcoin.opcodes.OP_RETURN,
    // payload for OMNI PROTOCOL:
    data
  ])

  tx.addOutput(recipient_address, fundValue)
  tx.addOutput(omniOutput, 0)

  tx.addOutput(alice_p2pkh, skipValue)

  tx.inputs.forEach((input, index) => {
    tx.sign(index, alice_pair)
  })

  return tx
}

module.exports = {
  createSimpleSend,
}
