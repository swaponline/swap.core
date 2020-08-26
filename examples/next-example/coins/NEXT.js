const fetch = require('node-fetch');

const { networkType } = require('./../domain/network')

const NEXT = {
  networks: {
    'mainnet': {
      type: networkType.mainnet,
      bip32settings: {
        messagePrefix: '\x18Bitcoin Signed Message:\n',
        bech32: 'bc', // todo: set right value
        bip32: {
          public: 0x0488B21E,
          private: 0x0488ADE4,
        },
        pubKeyHash: 0x6f, // todo: set right value
        scriptHash: 0xc4, // todo: set right value
        wif: 0xef, // todo: set right value
      },
      bip44coinIndex: 707,
      getBalance: async (addr) => await fetchBalance(networkType.mainnet, addr)
    },
    /*
    'testnet': { //testnet is down???
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
      getBalance: async (addr) => await fetchBalance(networkType.testnet, addr)
    }
    */
  }
}


// next.exhnage API documentation:
// https://explore.next.exchange/#/api

const getApiUrl = (netwType) => {
  if (netwType === networkType.mainnet) {
    return 'https://explore.next.exchange/api'
  }
  /*if (netwType === networkType.testnet) {
    return ''
  }*/
  throw new Error('Unknown networkType')
}

const fetchBalance = async (networkType, address) => {
  const apiUrl = getApiUrl(networkType);
  const response = await fetch(`${apiUrl}/address/${address}`);
  try {
    const json = await response.json();
    return json.balance;
  } catch (e) { // todo: improve
    return 0
  }
}

module.exports = NEXT

