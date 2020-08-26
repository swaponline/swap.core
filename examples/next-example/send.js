const bip39 = require('bip39')
const bip32 = require('bip32')
const bitcore = require('ghost-bitcore-lib')

const Networks = bitcore.Networks
const PrivateKey = bitcore.PrivateKey
const PublicKey = bitcore.PublicKey
const Transaction = bitcore.Transaction
const Address = bitcore.Address

const api = require('./api')


const networkType = {
  mainnet: 'mainnet',
  testnet: 'testnet',
}

const coins = {
  'BTC': {
    networks: {
      // bip32settings from https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/src/networks.js
      'mainnet': {
        type: networkType.mainnet,
        bip32settings: {
          messagePrefix: '\x18Bitcoin Signed Message:\n',
          bech32: 'bc',
          bip32: {
            public: 0x0488b21e,
            private: 0x0488ade4,
          },
          pubKeyHash: 0x00,
          scriptHash: 0x05,
          wif: 0x80,
        },
        bip44coinIndex: 0,
      },
      'testnet': {
        type: networkType.testnet,
        bip32settings: {
          messagePrefix: '\x18Bitcoin Signed Message:\n',
          bech32: 'tb',
          bip32: {
            public: 0x043587cf,
            private: 0x04358394,
          },
          pubKeyHash: 0x6f,
          scriptHash: 0xc4,
          wif: 0xef,
        },
        bip44coinIndex: 1,
      }
    }
  },
  'GHOST': {
    networks: {
      // bip32settings from https://github.com/JoaoCampos89/ghost-samples/blob/master/examples/transaction/index.js
      // bip32settings from https://github.com/ghost-coin/ghost-bitcore-lib/blob/master/lib/networks.js (wrong?)
      'mainnet': {
        type: networkType.mainnet,
        bip32settings: {
          messagePrefix: '\x18Bitcoin Signed Message:\n',
          bech32: 'gp',
          bip32: {
            public:  0x68df7cbd,
            private: 0x8e8ea8ea,
          },
          pubKeyHash: 0x26,
          scriptHash: 0x61,
          wif: 0xa6,
        },
        bip44coinIndex: 531,
      },
      'testnet': {
        type: networkType.testnet,
        bip32settings: {
          messagePrefix: '\x18Bitcoin Signed Message:\n',
          bech32: 'tb',
          bip32: {
            public: 0x043587cf,
            private: 0x04358394,
          },
          pubKeyHash: 0x6f,
          scriptHash: 0xc4,
          wif: 0x2e,
        },
        bip44coinIndex: 531,
      }
    }
  },
  'NEXT': {
    networks: {
      'mainnet': {
        type: networkType.mainnet,
        bip32settings: {
          messagePrefix: '\x18Bitcoin Signed Message:\n',
          bech32: ,
          bip32: {
            public: 0x0488B21E,
            private: 0x0488ADE4,
          },
          pubKeyHash: ,
          scriptHash: ,
          wif: ,
        },
        bip44coinIndex: 707,
      },
      'testnet': {
        type: networkType.testnet,
        bip32settings: {
          messagePrefix: '\x18Bitcoin Signed Message:\n',
          bech32: ,
          bip32: {
            public: 0x043587CF,
            private: 0x04358394,
          },
          pubKeyHash: ,
          scriptHash: ,
          wif: ,
        },
        bip44coinIndex: 1,
      }
    }
  }
}


const createDerivePath = (network) => { // see bip-44
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

  const unspent = await api.fetchUnspents(address.toString())

  const tx = new bitcore.Transaction()
    .from(unspent)  // Feed information about what unspent outputs one can use
    .to(to, amount)   // Add an output with the given amount of satoshis
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
  const answer = await api.publishRawTx(rawTx)
  console.log('tx sended:', answer)
})()


