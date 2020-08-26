const { networkType } = require('./../../domain/network')

const BTC = {
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
}

module.exports = BTC