const bip32 = require('bip32')
const bip39 = require('bip39')
const ghost_bitcore = require('ghost-bitcore-lib')

const fetch = require('node-fetch');

const { networkType } = require('./../domain/network')


const netNames = {
  'mainnet': 'mainnet',
  'testnet': 'testnet',
}

const GHOST = {
  ticker: 'GHOST',
  name: 'Ghost',
  precision: 8,
  networks: netNames,

  [netNames.mainnet]: {
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
    publishRawTx: async (rawTx) =>
      await connector.publishRawTx(networkType.mainnet, rawTx),
    getTxUrl: (txId) =>
      connector.getTxUrl(networkType.mainnet, txId),
  },

  [netNames.testnet]: {
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
    accountFromMnemonic: (mnemonic) =>
      libAdapter.accountFromMnemonic(mnemonic, netNames.testnet),
    getBalance: async (addr) =>
      await connector.fetchBalance(networkType.testnet, addr),
    createTx: async ({ account, amount, to }) =>
      await libAdapter.createTx({
        netName: netNames.testnet,
        account,
        amount,
        to
      }),
    publishRawTx: async (rawTx) =>
      await connector.publishRawTx(networkType.testnet, rawTx),
    getTxUrl: (txId) =>
      connector.getTxUrl(networkType.testnet, txId),
  }
}

module.exports = GHOST



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
      return `https://testnet.ghostscan.io/tx/${txId}`
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

  async fetchUnspents(addr) {
    //const apiUrl = getApiUrl(netType);
    // todo: mainnet support
    const apiUrl = connector.getApiUrl(networkType.testnet);
    const response = await fetch(`${apiUrl}/addr/${addr}/utxo`);
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
    const network = GHOST[netName]

    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const root = bip32.fromSeed(seed, network.bip32settings)
    const derivePath = createDerivePath(network)
    const child = root.derivePath(derivePath)

    const Networks = ghost_bitcore.Networks
    const PrivateKey = ghost_bitcore.PrivateKey
    const PublicKey = ghost_bitcore.PublicKey
    const Address = ghost_bitcore.Address

    const privateKey = new PrivateKey.fromWIF(child.toWIF(), 'testnet')
    const publicKey = PublicKey(privateKey, Networks.testnet) // ???
    const address = new Address(publicKey, Networks.testnet)

    const account = {
      privateKey,
      publicKey,
      address
    }

    return account
  },

  async createTx({ netName, account, amount, to }) {
    const { privateKey, publicKey, address } = account

    const network = GHOST[netName]
    const addressStr = address.toString()
    const unspent = await connector.fetchUnspents(addressStr)

    const tx = new ghost_bitcore.Transaction()
      .from(unspent)
      .to(to, amount)  // [sat]
      .change(address)  // Where the rest of the funds will go
      .sign(privateKey) // Signs all the inputs it can

    const rawTx = tx.serialize() // raw tx to broadcast
    return rawTx
  }

}
