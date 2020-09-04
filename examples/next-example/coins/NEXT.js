const bip32 = require('bip32')
const bip39 = require('bip39')
const bitcore = require('bitcore-lib')

const fetch = require('node-fetch');

const { networkType } = require('./../domain/network')
const bip44 = require('./../helpers/bip44')


const netNames = {
  'mainnet': 'mainnet',
  //'testnet': 'testnet', // testnet is down
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
      bech32: 'bc', // not needed?
      bip32: {
        public: 0x0488B21E,
        private: 0x0488ADE4,
      },
      pubKeyHash: 75,
      scriptHash: 5,
      wif: 128,
    },
    bip44settings: {
      coinIndex: 707,
    },
    accountFromMnemonic: (mnemonic) =>
      libAdapter.accountFromMnemonic(mnemonic, netNames.mainnet),
    getBalance: async (addr) =>
      await connector.fetchBalance(networkType.mainnet, addr),
    createTx: async ({ account, amount, to }) =>
      await libAdapter.createTx({
        netName: netNames.mainnet,
        account,
        amount,
        to
      }),
    get _connector() { // todo: remove
      return connector
    },
  },

  // testnet is down
  /* 
  [networks.testnet]: {  
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
    bip44settings: {
      coinIndex: 1,
    },
    getBalance: async (addr) => await fetchBalance(networkType.testnet, addr)
  }
  */
}

module.exports = NEXT



const libAdapter = {

  accountFromMnemonic(mnemonic, netName) {
    const network = NEXT[netName]

    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const root = bip32.fromSeed(seed, network.bip32settings)
    const derivePath = bip44.createDerivePath(network)
    const child = root.derivePath(derivePath)


    const libNetworkName = 'next-mainnet'
    bitcore.Networks.add({
      name: libNetworkName,
      pubkeyhash: 75,
      privatekey: 128,
      scripthash: 5,
      xpubkey: 0x0488B21E,
      xprivkey: 0x0488ADE4,
      networkMagic: 0xcbe4d0a1,
      port: 7077
    })
    const libNetwork = bitcore.Networks.get(libNetworkName)

    const privateKey = new bitcore.PrivateKey.fromWIF(child.toWIF())
    const publicKey = bitcore.PublicKey(privateKey, libNetwork)
    const address = new bitcore.Address(publicKey, libNetwork)

    const account = {
      privateKey,
      publicKey,
      address
    }

    return account
  },

  async createTx({ netName, account, amount, to }) {
    const { privateKey, publicKey, address } = account

    const network = NEXT[netName]
    const addressStr = address.toString()
    const unspent = await connector.fetchUnspents(network.type, addressStr)

    const tx = new bitcore.Transaction()
      .from(unspent)
      .to(to, amount)  // [sat]
      .change(address)  // Where the rest of the funds will go
      .sign(privateKey) // Signs all the inputs it can

    const rawTx = tx.serialize() // raw tx to broadcast
    return rawTx
  }

}



const connector = {

  // next.exhnage API documentation:
  // https://explore.next.exchange/#/api

  getApiUrl(netType) {
    if (netType === networkType.mainnet) {
      return 'https://explore.next.exchange/api'
    }

    // testnet is down
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
  },

  async fetchUnspents(netType, addr) {
    // todo: localhost -> server
    const apiUrl = 'http://localhost:32251'

    //const apiUrl = connector.getApiUrl(netType);

    const response = await fetch(`${apiUrl}/${netType}/addr/${addr}/utxo`);
    console.log(response)

    if (response.status !== 200) {
      throw new Error(`Can't fetch unspents - ${response.status}, ${response.statusText}`)
    }

    const json = await response.json();
    return json;
    //
  },

}
