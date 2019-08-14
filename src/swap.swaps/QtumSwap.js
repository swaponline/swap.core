import { encodeMethod } from 'qtumjs-ethjs-abi'
import qtum from 'qtumjs-lib'
import SwapApp, { constants } from 'swap.app'
import {networks} from "qtumjs-wallet";

class QtumInstance {
  static modifyWalletAddress(address) {
    console.log('modifyWalletAddress', address)
    return qtum.address.fromBase58Check(address).hash.toString('hex')
  }

  constructor(options) {

    if (!Array.isArray(options.abi)) {
      throw new Error(`Qtum instance: Options abi is required, expected ${options.abi}`)
    }

    this.abi = options.abi
    this.address = options.address
    this.gasPrice = options.gasPrice || 400
    this.gasLimit = options.gasLimit || 3e6

    this.methods = null
    this.wallet = null

    this._swapName = constants.COINS.qtum
  }

  _initSwap(app) {
    console.warn("CREATE")

    this.app = app
    this.methods = this.abi.reduce((acc, params) => {
      const { name, type } = params

      if (type === 'function') {
        return {
          ...acc,
          [name]: params,
        }
      }

      return acc
    })

    const network = this.app.isMainNet()
      ? networks.mainnet
      : networks.testnet

    const privateKey = this.app.env.storage.storage.getItem(`${this.app.network}:qtum:privateKey`)

    this.wallet = network.fromWIF(privateKey)
  }

  executeMethod(executor, method, args = [], params = {}) {
    const methodParams  = this.methods[method]

    if (!methodParams) {
      throw new Error('executeMethod: Method in abi not found')
    }

    const encodedData = encodeMethod(methodParams, args).substr(2)

    return new Promise((resolve, reject) => {
      this.wallet[executor](this.address, encodedData, {
        ...params,
        feeRate: this.gasPrice,
      })
      .then((tx) => {
        resolve(tx)
      })
      .catch((err) => {
        reject(err)
      })
    })
  }

  call(method, args, params = {}) {
    return new Promise((resolve, reject) => {
      this.executeMethod('contractCall', method, args, params)
      .then((receipt) => {
        const { executionResult: { output } } = receipt

        resolve(output.replace(/^0+/, '') || null)
      }, (err) => {
        reject(err)
      })
    })
  }

  async send(method, args, params = {}) {
    const { txid: txId } = await this.executeMethod('contractSend', method, args, params)

    console.log('\rTransaction:', txId)

    return txId
  }

  async createSwap({ secretHash, address, amount }, hashListener) {
    // TODO add error handler
    const amountSatoshi = amount * 1e8

    const args    = [ secretHash, QtumInstance.modifyWalletAddress(address) ]
    const params  = { amount: amountSatoshi }

    // TODO keyPair
    const txId = await this.send('createSwap', args, params)

    // TODO check qtum listener events
    hashListener(txId)
    return 'success'
  }

  async getSwapBalance({ ownerAddress, participantAddress }) {
    const args = [
      QtumInstance.modifyWalletAddress(ownerAddress),
      QtumInstance.modifyWalletAddress(participantAddress)
    ]

    // TODO keyPair, rename on ABI method
    return  await this.call('getBalance', args)
  }

  async checkBalance({ ownerAddress, participantAddress, expectedValue }) {
    const balance = await this.getSwapBalance({ ownerAddress, participantAddress })
    console.log('checkBalance', balance)
    console.log('expectedValue', expectedValue)

    if (expectedValue.isGreaterThan(balance)) {
      return `Expected value: ${expectedValue.toNumber()}, got: ${balance}`
    }
  }

  async withdraw({ secret, ownerAddress, participantAddress }, hashListener) {
    console.log('withdraw', secret, ownerAddress, participantAddress)
    const args = [
      secret,
      QtumInstance.modifyWalletAddress(participantAddress),
      QtumInstance.modifyWalletAddress(ownerAddress)
    ]
    console.log('withdraw', args)

    // TODO keyPair
    const txId = await this.send('withdraw', args)

    // TODO check qtum listener events
    hashListener(txId)
    return 'success'
  }

  getSecret(ownerAddress, participantAddress) {
    const args = [
      QtumInstance.modifyWalletAddress(ownerAddress),
      QtumInstance.modifyWalletAddress(participantAddress)
    ]

    // TODO keyPair
    return this.call('getSecret', args)
  }

  async getBalance() {
    const info = await this.wallet.getInfo()

    return info.balance
  }

}

export default QtumInstance

export {
  QtumInstance,
}
