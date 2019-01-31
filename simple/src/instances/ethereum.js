const request = require('request-promise-native')
const debug = require('debug')

const Web3 = require('web3')

const WEB3_PROVIDERS = {
  // mainnet: new Web3.providers.HttpProvider(`https://mainnet.infura.io/JCnK5ifEPH9qcQkX0Ahl`),
  // testnet: new Web3.providers.HttpProvider(`https://rinkeby.infura.io/JCnK5ifEPH9qcQkX0Ahl`),
  testnet: new Web3.providers.HttpProvider(`https://tgeth.swaponline.site`),
  mainnet: new Web3.providers.HttpProvider(`https://geth.swaponline.site`),
  localnet: new Web3.providers.HttpProvider(`http://localhost:7545`),
}

const ETHERCHAIN_API = `https://www.etherchain.org/api/gasPriceOracle`
const BigNumber = require('bignumber.js')
const TEN = new BigNumber(10)

const filterError = (error) => {
  const { name, code, statusCode, options } = error

  debug('swap.core:ethereum')(`UnknownError: statusCode=${statusCode} ${error.message}`)

  throw error
}

class Ethereum {

  constructor(_network = 'testnet', _customProvider) {
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

        debug('swap.core:ethereum')('ETH Balance:', balance)

        return balance
      })
  }

  fetchTokenBalance(address, tokenAddress, decimals) {
    const base = TEN.pow(decimals) // 1e18 usually
    const url = `${this.etherscan}/api?module=account&action=tokenbalance&contractaddress=${tokenAddress}&address=${address}`

    return request.get(url)
      .then( json => JSON.parse(json))
      .then(({ result }) => result)
      .then( raw => BigNumber(raw).dividedBy( base ) )
      .then( num => num.toNumber())
      .catch(error => {
        debug('swap.core:ethereum')(`TokenBalanceError: ${error.statusCode} ${url} - Failed to fetch token balance (${tokenAddress}). Probably too frequent request!`)
        return '-'
      })
  }

  async sendTransaction({to, value}) {
    const from = this.core.eth.accounts.wallet[0]
    const gas = 1e5

    value = this.core.utils.toWei(value.toString())

    return this.core.eth.sendTransaction({ from, to, value, gas })
  }

  async estimateGasPrice(options) {
    try {
      return await this.estimateGasPriceEtherChain(options)
    } catch (err) {
      console.error(`EstimateFeeError: EtherChain ${err.message}, falling back to Web3 estimation...`)
      return await this.estimateGasPriceWeb3(options)
    }
  }

  async estimateGasPriceWeb3({ speed = 'normal' } = {}) {
    const _multiplier = (() => {
      switch (speed) {
        case 'fast':    return 2
        case 'normal':  return 1
        case 'slow':    return 0.5
        default:      return 1
      }
    })()

    const gasPrice = await new Promise((resolve, reject) =>
      this.core.eth.getGasPrice((err, gasPrice) => {
        if (err) {
          reject(err)
        } else {
          resolve(gasPrice)
        }
      })
    )

    return BigNumber(gasPrice).times(_multiplier).toNumber()
  }

  estimateGasPriceEtherChain({ speed = 'normal' } = {}) {
    const _speed = (() => {
      switch (speed) {
        case 'fast':    return 'fast'
        case 'normal':  return 'standard'
        case 'slow':    return 'safeLow'
        default:      return 'standard'
      }
    })()

    return request
      .get(`${ETHERCHAIN_API}`)
      .then(json => JSON.parse(json))
      .then(fees => Number(fees[_speed]))
      .catch(error => filterError(error))
  }
}

module.exports = new Ethereum()
module.exports.mainnet = () => new Ethereum('mainnet')
module.exports.testnet = () => new Ethereum('testnet')
module.exports.localnet = () => new Ethereum('localnet')
