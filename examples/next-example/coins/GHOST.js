const fetch = require('node-fetch');

const { networkType } = require('./../domain/network')

const GHOST = {
  ticker: 'GHOST',
  name: 'Ghost',
  precision: 8,
  networks: {
    'mainnet': {
      type: networkType.mainnet,
      bip32settings: {
        // bip32settings from https://github.com/JoaoCampos89/ghost-samples/blob/master/examples/transaction/index.js
        // bip32settings from https://github.com/ghost-coin/ghost-bitcore-lib/blob/master/lib/networks.js (wrong?)
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
      getBalance: async (addr) =>
        await connector.fetchBalance(networkType.mainnet, addr),

      // not public?
      /*fetchUnspents: async (addr) =>
        await connector.fetchUnspents(networkType.testnet, addr),*/

      publishRawTx: async (rawTx) =>
        await connector.publishRawTx(networkType.mainnet, rawTx),

      getTxUrl: (txId) =>
        connector.getTxUrl(networkType.mainnet, txId),
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
      getBalance: async (addr) =>
        await connector.fetchBalance(networkType.testnet, addr),

      // not public?
      /*fetchUnspents: async (addr) =>
        await connector.fetchUnspents(networkType.testnet, addr),*/

      publishRawTx: async (rawTx) =>
        await connector.publishRawTx(networkType.testnet, rawTx),

      getTxUrl: (txId) =>
        connector.getTxUrl(networkType.testnet, txId),
    }
  }
}


const connector = {

  getApiUrl(netType) {
    if (netType === networkType.mainnet) {
      return 'https://ghostscan.io/ghost-insight-api'
    }
    if (netType === networkType.testnet) {
      return 'https://testnet.ghostscan.io/ghost-insight-api'
    }
    throw new Error('Unknown networkType')
  },

  getTxUrl(netType, txId) {
    if (netType == networkType.mainnet) {
      return `https://ghostscan.io/tx/${txId}`
    }
    if (netType == networkType.testnet) {
      return `https://testnet.ghostscan.io/${txId}`
    }
  },

  async fetchBalance(netType, address) {
    const apiUrl = connector.getApiUrl(netType);
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
        '...', '...'
      ]
    }
  */
    return json.balance;
  },

  async fetchUnspents(address) {
    //const apiUrl = getApiUrl(netType);
    // todo: mainnet support
    const apiUrl = connector.getApiUrl(networkType.testnet);
    const response = await fetch(`${apiUrl}/addr/${address}/utxo`);
    const json = await response.json();
    return json;
  },

  async fetchTx(txid) {
    /*
    const apiUrl = connector.getApiUrl(network);
    const response = await fetch(`${apiUrl}/tx/${txid}`);
    const json = await response.json();
    return json;
    */
  },

  async fetchRawTx(txid) {
    /*
    const apiUrl = connector.getApiUrl(network);
    const response = await fetch(`${apiUrl}/rawtx/${txid}`);
    const json = await response.json();
    return json;
    */
  },

  async publishRawTx(netType, rawTx) {
    const apiUrl = connector.getApiUrl(netType);
    const response = await fetch(`${apiUrl}/tx/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawtx: rawTx }),
    });
    const json = await response.json();
    return json;
  },

}


module.exports = GHOST