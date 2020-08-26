const fetch = require('node-fetch');
const BigNumber = require('bignumber.js')

const { networkType } = require('./../domain/network')

const BTC = {
  ticker: 'BTC',
  name: 'Bitcoin',
  precision: 8,
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
      getBalance: async (addr) => await fetchBalance(networkType.mainnet, addr),
      //publishTx: async (rawTx) => await publishTx(networkType.testnet, rawTx)
      getTxUrl: (getTxUrl) => getTxUrl(networkType.mainnet, txId),
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
      getBalance: async (addr) => await fetchBalance(networkType.testnet, addr),
      publishTx: async (rawTx) => await publishTx(networkType.testnet, rawTx),
      getTxUrl: (getTxUrl) => getTxUrl(networkType.testnet, txId),
    }
  }
}


// bitcore API documentation:
// https://github.com/bitpay/bitcore/blob/master/packages/bitcore-node/docs/api-documentation.md

const getApiUrl = (netwType) => {
  if (netwType === networkType.mainnet) {
    return 'https://api.bitcore.io/api/BTC/mainnet'
  }
  if (netwType === networkType.testnet) {
    return 'https://api.bitcore.io/api/BTC/testnet'
  }
  throw new Error('Unknown networkType')
}

const fetchBalance = async (networkType, address) => {
  const apiUrl = getApiUrl(networkType);
  const response = await fetch(`${apiUrl}/address/${address}/balance`);
  const json = await response.json();
  const balanceSat = json.balance;
  const balanceBTC = (new BigNumber(balanceSat)).dividedBy(10 ** BTC.precision)
  return balanceBTC.toNumber();
}

const publishTx = async (networkType, rawTx) => {
  const apiUrl = getApiUrl(networkType);
  const response = await fetch(`${apiUrl}/tx/send`, {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({'rawTx': rawTx}),
  })
  const json = await response.json()
  return json
}


const getTxUrl = (netType, txId) => {
  if (netType == networkType.mainnet) {
    return `https://www.blockchain.com/btc/tx/${txId}`
  }
  if (netType == networkType.testnet) {
    return `https://www.blockchain.com/btc-testnet/tx/${txId}`
  }
}

module.exports = BTC