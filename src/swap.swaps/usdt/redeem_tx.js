
const bitcoin = require('bitcoinjs-lib')
const net = process.env.NETWORK === 'testnet'
  ? bitcoin.networks.testnet
  : bitcoin.networks.bitcoin

const getUnspents = require('./unspents')
const createScript = require('./swap_script')
const createOmniScript = require('./omni_script')
const getAddress = require('./get_address')

const createRedeemTransaction = async (dialog, scriptValues, amount, getUnspents, network) => {
  const { owner: alice_pair, party: recipient_key } = dialog
  const { hash, lockTime: locktime, scriptAddress, txid } = scriptValues

  const tx = new bitcoin.TransactionBuilder(network)

  // input 0 = utxo from funding_tx
  // input 1 = utxo from Alice with SIGHASH_ALL
  console.log('script', scriptAddress)

  const unspents = await getUnspents(alice_pair.getAddress())
  const scriptUnspents = await getUnspents(scriptAddress)

  const utxo      = unspents[0]
  const dust      = 546
  const fundValue = dust // dust
  const feeValue  = 2000

  const totalUnspent  = unspents.reduce((summ, { satoshis }) => summ + satoshis, 0)
  const skipValue = utxo.satoshis - fundValue - feeValue - dust
  // dust accounts extra fee that was used for funding_tx, but not yet in the balance

  // const skipValue = scriptUnspents.map(u => u.satoshis).reduce((sum, sat) => sum + sat, 0) - fundValue - feeValue

  if (utxo.satoshis < feeValue + fundValue) {
    throw new Error(`Total less than fee: ${utxo.satoshis} < ${feeValue} + ${fundValue}`)
  }

  if (scriptUnspents.length === 0 && !txid) {
    throw new Error(`Script is not funded yet: ${scriptAddress}`)
  }

  // const swapScript = fundingTx.tx.ins[0].script
  // const chunksIn = bitcoin.script.decompile(swapScript)
  // const scriptHash = bitcoin.crypto.hash160(chunksIn[chunksIn.length - 1])
  // const address = bitcoin.address.toBase58Check(scriptHash, net.scriptHash)

  // const inputs = [
  //   { txid, vout: 0},
  //   { txid, vout: 0},
  //
  //   scriptUnspents[0] || { txid, vout: 0 },
  //   unspents[0],
  //   // ...unspents,
  // ]

  // inputs.forEach(({ txid, vout }) => tx.addInput(txid, vout, 0xfffffffe))

  tx.addInput(txid, 1)
  tx.addInput(txid, 0)

  // outputs = simple send

  const omniOutput = createOmniScript(amount)

  const recipient_address = getAddress(recipient_key)
  tx.addOutput(omniOutput, 0)
  tx.addOutput(recipient_address, fundValue) // should be first!

  tx.addOutput(alice_pair.getAddress(), skipValue)

  // signing

  tx.inputs.forEach((input, index) => {
    if ( index == 1 ) {
      return
    } else {
      tx.sign(index, alice_pair)
    }
  })

  return tx
}

module.exports = createRedeemTransaction
