const bip39 = require('bip39')
const bip32 = require('bip32')
const bitcore = require('ghost-bitcore-lib')

const Networks = bitcore.Networks
const PrivateKey = bitcore.PrivateKey
const PublicKey = bitcore.PublicKey
const Address = bitcore.Address
const Transaction = bitcore.Transaction


const coins = require('./coins')


const createDerivePath = (network) => {
  // see bip-44

  //const testnetCoinIndex = 1 // (all coins)
  //const coinIndex = (network.type === networkType.testnet) ? testnetCoinIndex : network.bip44coinIndex
  const coinIndex = network.bip44coinIndex
  const addressIndex = 0
  const path = `m/44'/${coinIndex}'/0'/0/${addressIndex}`
  return path;
}

const createTx = async ({ mnemonic, network, amount, to }) => {
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const root = bip32.fromSeed(seed, network.bip32settings)
  const derivePath = createDerivePath(network)
  const child = root.derivePath(derivePath)
  const privateKey = new PrivateKey.fromWIF(child.toWIF(), 'testnet')
  const publicKey = PublicKey(privateKey, Networks.testnet) // ???
  const address = new Address(publicKey, Networks.testnet)

  const unspent = await coins.GHOST.networks.testnet.fetchUnspents(address.toString())

  const tx = new bitcore.Transaction()
    .from(unspent)  // Feed information about what unspent outputs one can use
    .to(to, amount)  // Add an output with the given amount of satoshis
    .change(address)  // Sets up a change address where the rest of the funds will go
    .sign(privateKey) // Signs all the inputs it can

  const rawTx = tx.serialize() // raw tx to broadcast
  return rawTx
}


// Set TX params
const mnemonic = 'praise you muffin lion enable neck grocery crumble super myself license ghost'
const network = coins.GHOST.networks.testnet
const amount = 1e8 // 1 Ghost coin
const to = 'XPtT4tJWyepGAGRF9DR4AhRkJWB3DEBXT2';

// Create and publish
(async () => {
  const rawTx = await createTx({ mnemonic, network, amount, to })
  console.log('tx created:', rawTx)
  const answer = await coins.GHOST.networks.testnet.publishRawTx(rawTx)
  console.log('tx sended:', answer)
})()


