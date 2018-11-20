const { bitcoin, ethereum } = require('../instances')

const isMain = false
const BLOCKCHAININFO = isMain ? `https://blockchain.info` : `https://testnet.blockchain.info`
const ETHERSCANIO = isMain ? `https://etherscan.io` : `https://rinkeby.etherscan.io`

class Wallet {
  constructor(app, constants, config) {
    this.id = config.id
    this.network = app.network
    this.ethereum = ethereum
    this.bitcoin = bitcoin
    this.swapApp = app
    this.constants = constants
    this.auth = app.services.auth
  }

  async withdraw(from, to, value) {
    switch (from) {
      case 'btc':
        const account = this.auth.accounts.btc
        return await this.bitcoin.sendTransaction({ account, to, value })
      case 'eth':
        return await this.ethereum.sendTransaction({to, value})
      default:
        return Promise.reject('not implemented')
    }
  }
  async getBalanceBySymbol(symbol) {

    let balances = await this.getBalance()

    return balances.find(x => x.symbol === symbol)
  }

  async getBalance() {
    const currencies = Object.values(this.constants.COINS)
    const data = this.auth.getPublicData()

    const fetch = currencies.map(
      symbol => {
        const account = symbol == 'BTC' || symbol == 'BCH' || symbol == 'USDT' ? data.btc : data.eth
        const instance = this.swapApp.swaps[symbol]

        return instance ? instance.fetchBalance(account.address) : '-'
      })

    const values = await Promise.all( fetch )

    return values.map((value, index) => ({
      symbol: currencies[index],
      value,
    }))
  }

  getCore() {
    return {
      eth: this.ethereum.core,
      btc: this.bitcoin.core,
    }
  }

  view() {
    return {
      id: this.id,
      network: this.network,
      mainnet: this.swapApp.isMainNet(),
      'etherscan.io': `${ETHERSCANIO}/address/${this.auth.accounts.eth.address}`,
      'blockchain.info': `${BLOCKCHAININFO}/address/${this.auth.accounts.btc.getAddress()}`,
      room: this.swapApp.services.room.roomName,
      ...this.auth.getPublicData(),
    }
  }

  async detailedView() {
    const gasPrice = await this.ethereum.core.eth.getGasPrice()
    const gasLimit = 3e6 // TODO sync with EthSwap.js
    const btcFee = 15000 // TODO sync with BtcSwap.js and bitcoin instance

    return {
      eth: {
        gasPrice,
        gasLimit,
        // ...ethereum.core,
      },
      btc: {
        fee: btcFee,
        // ...bitcoin.core,
      },
      wallet: this.view()
    }
  }

}

module.exports = Wallet
