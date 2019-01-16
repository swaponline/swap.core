const bitcoin = require('bitcoinjs-lib')
const request = require('request-promise-native')
const BigNumber = require('bignumber.js')
const debug = require('debug')

// const BITPAY = isMain ? `https://insight.bitpay.com/api` : `https://test-insight.bitpay.com/api`
const BITPAY = false ? `https://insight.bitpay.com/api` : `https://test-insight.swap.online/insight-api`
const BITPAY_MAIN = `https://insight.bitpay.com/api`

const BLOCKCYPHER_API = `https://api.blockcypher.com/v1/btc/main/`
const EARN_COM = `https://bitcoinfees.earn.com/api/v1/fees/recommended`
const BLOCKCYPHER_API_TOKEN = process.env.BLOCKCYPHER_API_TOKEN

const filterError = (error) => {
  const { name, code, statusCode, options } = error

  if (name == 'StatusCodeError' && statusCode == 525)
    debug('swap.core:bitcoin')('Error:', `BITPAY refuse:`, options.method, options.uri)
  else
    debug('swap.core:bitcoin')('Error:', code, name, statusCode, options)

  throw error
}

class Bitcoin {

  constructor(_network) {
    this.core = bitcoin

    this.net = bitcoin.networks[_network === 'mainnet' ? 'bitcoin' : 'testnet']
    this.network = _network
    this.root = this.network === 'testnet' ? BITPAY : BITPAY_MAIN
  }

  getRate() {
    return new Promise((resolve) => {
      request.get('https://noxonfund.com/curs.php')
        .then(({ price_btc }) => {
          resolve(price_btc)
        })
    })
  }

  login(_privateKey) {
    let privateKey = _privateKey

    if (!privateKey) {
      const keyPair = this.core.ECPair.makeRandom({ network: this.net })
      privateKey    = keyPair.toWIF()
    }

    const account     = new this.core.ECPair.fromWIF(privateKey, this.net)
    const address     = account.getAddress()
    const publicKey   = account.getPublicKeyBuffer().toString('hex')

    account.__proto__.getPrivateKey = () => privateKey

    console.info('Logged in with Bitcoin', {
      account,
      address,
      privateKey,
      publicKey,
    })

    return account
  }

  estimateFeeRate({ speed = 'fastestFee' } = {}) {
    const _speed = (() => {
      switch (speed) {
        case 'fast':    return 'fastestFee'
        case 'normal':  return 'halfHourFee'
        case 'slow':    return 'hourFee'
        default:      return 'halfHourFee'
      }
    })()

    // {
    //   fast: 'fastestFee',
    //   normal: 'fastFee',
    //   slow: 'normalFee',
    // }[speed]

    return request
      .get(`${EARN_COM}`)
      .then(json => JSON.parse(json))
      .then(fees => Number(fees[_speed]))
      .catch(error => filterError(error))
  }

  fetchBalance(address) {
    return request.get(`${this.root}/addr/${address}`)
      .then(( json ) => {
        const balance = JSON.parse(json).balance
        debug('swap.core:bitcoin')('BTC Balance:', balance)

        return balance
      })
      .catch(error => filterError(error))
  }

  fetchUnspents(address) {
    return request
      .get(`${this.root}/addr/${address}/utxo`)
      .then(json => JSON.parse(json))
      .catch(error => filterError(error))
  }

  broadcastTx(txRaw) {
    return request.post(`${this.root}/tx/send`, {
      json: true,
      body: {
        rawtx: txRaw,
      },
    })
    .catch(error => filterError(error))
  }

  fetchTx(hash) {
    return request
      .get(`${this.root}/tx/${hash}`)
      .then(json => JSON.parse(json))
      .catch(error => filterError(error))
  }

  fetchTxInfo(hash) {
    return request
      .get(`${BLOCKCYPHER_API}/txs/${hash}/confidence?token=${BLOCKCYPHER_API_TOKEN}`)
      .catch(err => {
        if (!/transaction hasalready been confirmed/.test(err.message)
        &&  !/API calls limits/.test(err.message)) {
          debug('swap.core:bitcoin')(`bitcoin error: fetch tx info: ${err.message}`)
          throw err
        }

        return request.get(`${BLOCKCYPHER_API}/txs/${hash}`)
      })
      .then(json => JSON.parse(json))
      .catch(error => filterError(error))
  }

  fetchOmniBalance(address, assetId = 31) {
    return request.post(`https://api.omniexplorer.info/v1/address/addr/`, {
        json: true,
        form: {
          addr: address,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      .then(response => {
        const { error, balance } = response

        if (error) throw new Error(`Omni Balance: ${error}`)

        const findById = balance
          .filter(asset => parseInt(asset.id) === assetId || asset.id === assetId)

        if (!findById.length) {
          return 0
        }

        debug('swap.core:bitcoin')('Omni Balance:', findById[0].value)
        debug('swap.core:bitcoin')('Omni Balance pending:', findById[0].pendingpos)
        debug('swap.core:bitcoin')('Omni Balance pending:', findById[0].pendingneg)

        const usdsatoshis = BigNumber(findById[0].value)

        if (usdsatoshis) {
          return usdsatoshis.dividedBy(1e8).toNumber()
        } else {
          return 0
        }
      })
      .catch(error => debug('swap.core:bitcoin')('Error:', error))
  }

  async sendTransaction({ account, to, value }, handleTransactionHash) {
    const tx = new bitcoin.TransactionBuilder(this.net)

    value = BigNumber(value)

    const unspents      = await this.fetchUnspents(account.getAddress())

    const fundValue     = value.multipliedBy(1e8).integerValue().toNumber()
    const feeValue      = 1000
    const totalUnspent  = unspents.reduce((summ, { satoshis }) => summ + satoshis, 0)
    const skipValue     = totalUnspent - fundValue - feeValue

    if (totalUnspent < feeValue + fundValue) {
      throw new Error(`Total less than fee: ${totalUnspent} < ${feeValue} + ${fundValue}`)
    }

    unspents.forEach(({ txid, vout }) => tx.addInput(txid, vout, 0xfffffffe))
    tx.addOutput(to, fundValue)

    if (skipValue)
      tx.addOutput(account.getAddress(), skipValue)

    tx.inputs.forEach((input, index) => {
      tx.sign(index, account)
    })

    const txRaw = tx.buildIncomplete()

    if (typeof handleTransactionHash === 'function') {
      handleTransactionHash(txRaw.getId())
      debug('swap.core:bitcoin')('tx id', txRaw.getId())
    }

    debug('swap.core:bitcoin')('raw tx = ', txRaw.toHex())

    const result = await this.broadcastTx(txRaw.toHex())

    return result
  }
}

module.exports = new Bitcoin()
module.exports.mainnet = () => new Bitcoin('mainnet')
module.exports.testnet = () => new Bitcoin('testnet')
module.exports.localnet = () => new Bitcoin('testnet')
