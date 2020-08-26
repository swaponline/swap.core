const fetch = require('node-fetch');

const { networkType } = require('./../../domain/network')

const GHOST = {
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
      getBalance: async (addr) => await fetchBalance(networkType.mainnet, addr)
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
      getBalance: async (addr) => await fetchBalance(networkType.testnet, addr)
    }
  }
}


const getApiUrl = (netwType) => {
  if (netwType === networkType.testnet) {
    return 'https://testnet.ghostscan.io/ghost-insight-api'
  }
  if (netwType === networkType.mainnet) {
    return 'https://ghostscan.io/ghost-insight-api'
  }
  throw new Error('Unknown networkType')
}

const fetchBalance = async (networkType, address) => {
  const apiUrl = getApiUrl(networkType);
  const response = await fetch(`${apiUrl}/addr/${address}`);
  const json = await response.json();
  return json.balance;
}

const fetchUnspents = async (address) => {
  const apiUrl = getApiUrl(network);
  const response = await fetch(`${apiUrl}/addr/${address}/utxo`);
  const json = await response.json();
  return json;
}

const fetchTx = async (txid) => {
  const apiUrl = getApiUrl(network);
  const response = await fetch(`${apiUrl}/tx/${txid}`);
  const json = await response.json();
  return json;
}

const fetchRawTx = async (txid) => {
  const apiUrl = getApiUrl(network);
  const response = await fetch(`${apiUrl}/rawtx/${txid}`);
  const json = await response.json();
  return json;
}

const publishRawTx = async (rawTx) => {
  const response = await fetch(`${apiUrl}/tx/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawtx: rawTx }),
  });
  const json = await response.json();
  return json;
}


module.exports = GHOST