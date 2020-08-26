const fetch = require('node-fetch');

const { networkType } = require('./../domain/network')

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
  if (netwType === networkType.mainnet) {
    return 'https://ghostscan.io/ghost-insight-api'
  }
  if (netwType === networkType.testnet) {
    return 'https://testnet.ghostscan.io/ghost-insight-api'
  }
  throw new Error('Unknown networkType')
}

const fetchBalance = async (networkType, address) => {
  const apiUrl = getApiUrl(networkType);
  const response = await fetch(`${apiUrl}/addr/${address}`);
  const json = await response.json();
  /*
  {
    addrStr: 'XPtT4tJWyepGAGRF9DR4AhRkJWB3DEBXT2',
    balance: 0,
    balanceSat: 0,
    totalReceived: 1,
    totalReceivedSat: 100000000,
    totalSent: 1,
    totalSentSat: 100000000,
    unconfirmedBalance: 7,
    unconfirmedBalanceSat: 700000000,
    unconfirmedTxApperances: 7,
    txApperances: 2,
    transactions: [
      '66dd34435ecc09727c715b9b8564ac9830332acdcda283b92c084c640f7dec26',
      'd4817ba9cb3a9be673ea63b1d8c17040c60d190da5a2511152cf1aa6495d4f46',
      'fff5b4b4b17e63da4240a8020ec51c175e6f97a7b6da3b52e3a3ef132bf75385',
      'a0b2c19770a855771f5757f73586584ffdf99845f8265dcf16d17438ecf3d331',
      '1af126d9f6c8da588c8d5db8956ecdd3d0163f6564b6d1a6bb2c644b792dd404',
      '466aff0ffd8681776190bf95e242f5bae8763948d182e77aec68ee05fa165b62',
      '99a7ffcd12252b4e4c11b5cd76256fa3aa357f0202b13a5e168ca217fa609965',
      '6250c6771e9972506b82ae466b375dd06cc2cc5b5dcdae7121d542187dc45614',
      '14039d3e24d17b51b6dcefdae07fd17b142eefcaaa1ae2039dcf05717bc147a3'
    ]
  }
*/
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