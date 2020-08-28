const bip32 = require('bip32')
const bip39 = require('bip39')
const bitcore = require('bitcore-lib')

const fetch = require('node-fetch');

const { networkType } = require('./../domain/network')


const netNames = {
  'mainnet': 'mainnet',
  //'testnet': 'testnet', //testnet is down???
}

const NEXT = {
  ticker: 'NEXT',
  name: 'NEXT.coin',
  precision: 8,
  networks: netNames,

  [netNames.mainnet]: {
    type: networkType.mainnet,
    bip32settings: {
      messagePrefix: 'Nextcoin Signed Message:\n',
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
    accountFromMnemonic: (mnemonic) =>
      libAdapter.accountFromMnemonic(mnemonic, netNames.mainnet),
    getBalance: async (addr) =>
      await connector.fetchBalance(networkType.mainnet, addr)
  },

  /*
  [networks.testnet]: {  //testnet is down???
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

module.exports = NEXT



const connector = {

  // next.exhnage API documentation:
  // https://explore.next.exchange/#/api

  getApiUrl(netwType) {
    if (netwType === networkType.mainnet) {
      return 'https://explore.next.exchange/api'
    }
    /*if (netwType === networkType.testnet) {
      return ''
    }*/
    throw new Error('Unknown networkType')
  },

  async fetchBalance(networkType, address) {
    const apiUrl = connector.getApiUrl(networkType);
    const response = await fetch(`${apiUrl}/address/${address}`);
    try {
      const json = await response.json();
      return json.balance;
    } catch (e) { // todo: improve
      return 0
    }
  }

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
    const network = NEXT[netName]

    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const root = bip32.fromSeed(seed, network.bip32settings)
    const derivePath = createDerivePath(network)
    const child = root.derivePath(derivePath)

    // todo (compare BTC/bitcoinjs-lib => NEXT/it)

    const Networks = bitcore.Networks
    const PrivateKey = bitcore.PrivateKey
    const PublicKey = bitcore.PublicKey
    const Address = bitcore.Address

    var custom = {
      name: 'litecoin',
      pubkeyhash: 0x1c,
      privatekey: 0x1e,
      scripthash: 0x28,
      xpubkey: 0x02e8de8f,
      xprivkey: 0x02e8da54,
      networkMagic: 0x0c110907,
      port: 7333
    };
    Networks.add(custom);
    const libNetwork = Networks.get('litecoin')

    const privateKey = new PrivateKey.fromWIF(child.toWIF(), 'litecoin')
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
