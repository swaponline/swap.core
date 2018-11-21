const request = require('request-promise-native')

const Web3 = require('web3')

const WEB3_PROVIDERS = {
  mainnet: new Web3.providers.HttpProvider(`https://mainnet.infura.io/JCnK5ifEPH9qcQkX0Ahl`),
  testnet: new Web3.providers.HttpProvider(`https://rinkeby.infura.io/JCnK5ifEPH9qcQkX0Ahl`),
  localnet: new Web3.providers.HttpProvider(`http://localhost:7545`),
}

const BigNumber = require('bignumber.js')
const TEN = new BigNumber(10)

class Ethereum {

  constructor(_network = 'testnet') {
    const _provider = WEB3_PROVIDERS[_network]

    if (typeof web3 !== 'undefined') {
      this.core = new Web3(web3.currentProvider)
    } else {
      this.core = new Web3(_provider)
    }

    this.etherscan = _network === 'testnet'
      ? `https://rinkeby.etherscan.io`
      : `https://api.etherscan.io`
  }

  fetchBalance(address) {
    return this.core.eth.getBalance(address)
      .then((wei) => {
        let balance = Number(this.core.utils.fromWei(wei))

        console.log('ETH Balance:', balance)

        return balance
      })
  }

  fetchTokenBalance(address, tokenAddress, decimals) {
    const base = TEN.pow(decimals) // 1e18 usually
    return request.get(`${this.etherscan}/api?module=account&action=tokenbalance&contractaddress=${tokenAddress}&address=${address}`)
      .then( json => JSON.parse(json))
      .then(({ result }) => result)
      .then( raw => BigNumber(raw).dividedBy( base ) )
      .then( num => num.toNumber())
  }

  async sendTransaction({to, value}) {
    const from = this.core.eth.accounts.wallet[0]
    const gas = 1e5

    value = this.core.utils.toWei(value.toString())

    return this.core.eth.sendTransaction({ from, to, value, gas })
  }
}

module.exports = new Ethereum()
module.exports.mainnet = () => new Ethereum('mainnet')
module.exports.testnet = () => new Ethereum('testnet')
module.exports.localnet = () => new Ethereum('localnet')
