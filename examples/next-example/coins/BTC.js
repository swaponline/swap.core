const bip32 = require('bip32')
const bip39 = require('bip39')
const bitcore = require('bitcore-lib')

const fetch = require('node-fetch');
const BigNumber = require('bignumber.js')

const { networkType } = require('./../domain/network')


const netNames = {
  'mainnet': 'mainnet',
  'testnet': 'testnet',
}

const BTC = {
  ticker: 'BTC',
  name: 'Bitcoin',
  precision: 8,
  networks: netNames,

  [netNames.mainnet]: {
    type: networkType.mainnet,
    bip32settings: {
      // bip32settings from https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/src/networks.js
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
    accountFromMnemonic: (mnemonic) =>
      libAdapter.accountFromMnemonic(mnemonic, netNames.mainnet),
    getBalance: async (addr) =>
      await connector.fetchBalance(networkType.mainnet, addr),
    //publishTx: async (rawTx) => await publishTx(networkType.testnet, rawTx)
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
      wif: 0xef,
    },
    bip44coinIndex: 1,
    accountFromMnemonic: (mnemonic) =>
      libAdapter.accountFromMnemonic(mnemonic, netNames.testnet),
    getBalance: async (addr) =>
      await connector.fetchBalance(networkType.testnet, addr),
    publishTx: async (rawTx) =>
      await connector.publishTx(networkType.testnet, rawTx),
    getTxUrl: (txId) =>
      connector.getTxUrl(networkType.testnet, txId),
  }
}

module.exports = BTC



const connector = {

  // bitcore API documentation:
  // https://github.com/bitpay/bitcore/blob/master/packages/bitcore-node/docs/api-documentation.md

  getApiUrl(netwType) {
    if (netwType === networkType.mainnet) {
      return 'https://api.bitcore.io/api/BTC/mainnet'
    }
    if (netwType === networkType.testnet) {
      return 'https://api.bitcore.io/api/BTC/testnet'
    }
    throw new Error('Unknown networkType')
  },

  getTxUrl(netType, txId) {
    if (netType == networkType.mainnet) {
      return `https://www.blockchain.com/btc/tx/${txId}`
    }
    if (netType == networkType.testnet) {
      return `https://www.blockchain.com/btc-testnet/tx/${txId}`
    }
  },

  async fetchBalance(networkType, address) {
    const apiUrl = connector.getApiUrl(networkType);
    const response = await fetch(`${apiUrl}/address/${address}/balance`);
    const json = await response.json();
    const balanceSat = json.balance;
    const balanceBTC = (new BigNumber(balanceSat)).dividedBy(10 ** BTC.precision)
    return balanceBTC.toNumber();
  },

  async publishTx(networkType, rawTx) {
    const apiUrl = connector.getApiUrl(networkType);
    const response = await fetch(`${apiUrl}/tx/send`, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({'rawTx': rawTx}),
    })
    const json = await response.json()
    return json
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
    const network = BTC[netName]

    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const root = bip32.fromSeed(seed, network.bip32settings)
    const derivePath = createDerivePath(network)
    const child = root.derivePath(derivePath)

    const Networks = bitcore.Networks
    const PrivateKey = bitcore.PrivateKey
    const PublicKey = bitcore.PublicKey
    const Address = bitcore.Address

    let bitcoreNetwork, bitcoreNetName

    if (netName == netNames.mainnet) {
      bitcoreNetwork = Networks.mainnet
      bitcoreNetName = 'mainnet'
    }

    if (netName == netNames.testnet) {
      bitcoreNetwork = Networks.testnet
      bitcoreNetName = 'testnet'
    }

    if (!bitcoreNetwork && !bitcoreNetName) {
      throw new Error(`Unknown network: ${netName}`)
    }

    const privateKey = new PrivateKey.fromWIF(child.toWIF(), bitcoreNetName)
    const publicKey = PublicKey(privateKey, bitcoreNetwork)
    const address = new Address(publicKey, bitcoreNetwork)

    const account = {
      privateKey,
      publicKey,
      address
    }

    return account
  },
}
