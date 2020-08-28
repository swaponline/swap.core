const bip32 = require('bip32')
const bip39 = require('bip39')
const bitcore = require('bitcore-lib')

const fetch = require('node-fetch');

const { networkType } = require('./../domain/network')


const netNames = {
  'mainnet': 'mainnet',
  'testnet': 'testnet',
}

const LTC = {
  ticker: 'LTC',
  name: 'Litecoin',
  precision: 8, // ?
  networks: netNames,

  [netNames.mainnet]: {
    type: networkType.mainnet,
    bip32settings: {
      // from https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/addresses.spec.ts
      messagePrefix: '\x19Litecoin Signed Message:\n',
      bech32: 'ltc',
      bip32: {
        public: 0x019da462,
        private: 0x019d9cfe,
      },
      pubKeyHash: 0x30,
      scriptHash: 0x32,
      wif: 0xb0,
    },
    bip44coinIndex: 2,
    accountFromMnemonic: (mnemonic) =>
      libAdapter.accountFromMnemonic(mnemonic, netNames.mainnet),
  },

  [netNames.testnet]: {
    type: networkType.testnet,
    bip32settings: {
      // from https://github.com/trezor/trezor-common/pull/80/files
      messagePrefix: '\x19Litecoin Signed Message:\n',
      bech32: 'tltc',
      bip32: {
        public: 0x043587cf,
        private: 0x04358394,
      },
      pubKeyHash: 0x6f,
      scriptHash: 0xc4,
      wif: 0xef,
    },
    bip44coinIndex: 1,
    accountFromMnemonic: (mnemonic) =>
      libAdapter.accountFromMnemonic(mnemonic, netNames.testnet),
  }
}

module.exports = LTC



const connector = {
  // "https://testnet.litecore.io"
}


// todo: move/remove
const createDerivePath = (network) => {
  // see bip-44

  //const testnetCoinIndex = 1 // (all coins)
  //const coinIndex = (network.type === networkType.testnet) ? testnetCoinIndex : network.bip44coinIndex
  const coinIndex = network.bip44coinIndex
  const addressIndex = 0
  const path = `m/44'/${coinIndex}'/0'/0/${addressIndex}`
  return path;
}

const libAdapter = {

  accountFromMnemonic(mnemonic, netName) {
    const network = LTC[netName]

    // todo: move?

    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const root = bip32.fromSeed(seed, network.bip32settings)
    const derivePath = createDerivePath(network)
    const child = root.derivePath(derivePath)


    const Networks = bitcore.Networks
    const PrivateKey = bitcore.PrivateKey
    const PublicKey = bitcore.PublicKey
    const Address = bitcore.Address


    let libNetworkName

    if (netName == netNames.mainnet) {
      libNetworkName = 'litecoin-mainnet'
      Networks.add({
        // from https://github.com/litecoin-project/litecore-lib/blob/segwit/lib/networks.js
        name: libNetworkName,
        pubkeyhash: 0x30,
        privatekey: 0xb0,
        scripthash: 0x32,
        xpubkey: 0x019da462,
        xprivkey: 0x019d9cfe,
        networkMagic: 0xfbc0b6db,
        port: 9333
      });
    }
    if (netName == netNames.testnet) {
      libNetworkName = 'litecoin-testnet'
      Networks.add({
        // from https://github.com/litecoin-project/litecore-lib/blob/segwit/lib/networks.js
        // from https://github.com/litecoin-project/litecoin/blob/master/src/chainparams.cpp
        name: libNetworkName,
        pubkeyhash: 0x6f,
        privatekey: 0xef,
        scripthash: 0xc4,
        xpubkey: 0x043587cf,
        xprivkey: 0x04358394,
        networkMagic: 0xfdd2c8f1,
        port: 19335
      });
    }

    if (!libNetworkName) {
      throw new Error(`Unknown network: ${netName}`)
    }

    const libNetwork = Networks.get(libNetworkName)

    const privateKey = new PrivateKey.fromWIF(child.toWIF(), libNetworkName)
    const publicKey = PublicKey(privateKey, libNetwork)
    const address = new Address(publicKey, libNetwork)

    const account = {
      privateKey,
      publicKey,
      address
    }

    return account
  },
}
