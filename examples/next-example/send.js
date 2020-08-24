const bip39 = require('bip39')
const bip32 = require('bip32')
const bitcore = require('ghost-bitcore-lib')

const Networks = bitcore.Networks
const PrivateKey = bitcore.PrivateKey
const PublicKey = bitcore.PublicKey
const Transaction = bitcore.Transaction
const Address = bitcore.Address

const api = require('./api')


const testnet = { // ghost
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'tb',
  bip32: {
    public: 0x043587cf,
    private: 0x04358394,
  },
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0x2e,
}

const mainnet = { // ghost
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'gp',
  bip32: {
    public:  0x68df7cbd,
    private: 0x8e8ea8ea,
  },
  pubKeyHash: 0x26,
  scriptHash: 0x61,
  wif: 0xa6,
}

const SLIP_0044_coin_mainnet_index = 531 // https://github.com/satoshilabs/slips/blob/master/slip-0044.md

// Set TX params
const mnemonic = 'praise you muffin lion enable neck grocery crumble super myself license ghost'
const amount = 1e8 // 1 Ghost coin
const to = 'XPtT4tJWyepGAGRF9DR4AhRkJWB3DEBXT2'
const network = testnet;


const createTx = async ({ mnemonic, amount, to, network }) => {
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const root = bip32.fromSeed(seed, network)
  const child = root.derivePath("m/44'/531'/0'/0/0") // bip-44 path
  const privateKey = new PrivateKey.fromWIF(child.toWIF(), 'testnet')
  const publicKey = PublicKey(privateKey, Networks.testnet) // ???
  const address = new Address(publicKey, Networks.testnet)

  const unspent = await api.fetchUnspents(address.toString())

  const tx = new bitcore.Transaction()
    .from(unspent)  // Feed information about what unspent outputs one can use
    .to(to, amount)   // Add an output with the given amount of satoshis
    .change(address)  // Sets up a change address where the rest of the funds will go
    .sign(privateKey) // Signs all the inputs it can

  const rawTx = tx.serialize() // raw tx to broadcast
  return rawTx
}


// Create and publish
(async () => {
  const rawTx = await createTx({ mnemonic, amount, to, network })
  console.log('tx created:', rawTx)
  const answer = await api.publishRawTx(rawTx)
  console.log('tx sended:', answer)
})()


