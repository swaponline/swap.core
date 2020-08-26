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
    }
    */
  }
}

const getApiUrl = (netwType) => {
  if (netwType === networkType.mainnet) {
    return 'https://explore.next.exchange/#/api'
  }
  /*if (netwType === networkType.testnet) {
    return ''
  }*/
  throw new Error('Unknown networkType')
}

const fetchBalance = async (networkType, address) => {
  const apiUrl = getApiUrl(networkType);
  const response = await fetch(`${apiUrl}/address/${address}`);
  const json = await response.json();
  const balanceSat = json.balance;
  const balanceBTC = (new BigNumber(balanceSat)).dividedBy(10 ** BTC.precision)
  return balanceBTC.toNumber();
}

module.exports = NEXT

