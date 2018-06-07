import SwapApp, { SwapInterface } from '../swap.app'


class EthSwap extends SwapInterface {

  /**
   *
   * @param {object}    options
   * @param {string}    options.address
   * @param {array}     options.abi
   * @param {number}    options.gasLimit
   * @param {function}  options.fetchBalance
   */
  constructor(options) {
    super()

    if (typeof options.fetchBalance !== 'function') {
      throw new Error('EthSwap: "fetchBalance" required')
    }
    if (typeof options.address !== 'function') {
      throw new Error('EthSwap: "address" required')
    }
    if (typeof options.abi !== 'function') {
      throw new Error('EthSwap: "abi" required')
    }

    this.address        = options.address
    this.abi            = options.abi

    this._swapName      = 'ethSwap'
    this.gasLimit       = options.gasLimit || 3e6
    this.fetchBalance   = options.fetchBalance
  }

  _initSwap() {
    this.contract = new SwapApp.env.web3.eth.Contract(this.abi, this.address)
  }

  /**
   *
   * @param {object} data
   * @param {object} data.myAddress
   * @param {string} data.participantAddress
   * @param {function} handleTransactionHash
   */
  sign(data, handleTransactionHash) {
    const { myAddress, participantAddress } = data

    return new Promise(async (resolve, reject) => {
      const params = {
        from: myAddress,
        gas: this.gasLimit,
      }

      const receipt = await this.contract.methods.sign(participantAddress).send(params)
        .on('transactionHash', (hash) => {
          if (typeof handleTransactionHash === 'function') {
            handleTransactionHash(hash)
          }
        })
        .on('error', (err) => {
          reject(err)
        })

      resolve(receipt)
    })
  }

  /**
   *
   * @param {object} data
   * @param {object} data.myAddress
   * @param {string} data.secretHash
   * @param {string} data.participantAddress
   * @param {number} data.amount
   * @param {function} handleTransactionHash
   */
  create(data, handleTransactionHash) {
    const { myAddress, secretHash, participantAddress, amount } = data

    return new Promise(async (resolve, reject) => {
      const hash = `0x${secretHash.replace(/^0x/, '')}`

      const params = {
        from: myAddress,
        gas: this.gasLimit,
        value: Math.floor(SwapApp.env.web3.utils.toWei(String(amount))),
      }

      const values = [ hash, participantAddress ]

      const receipt = await this.contract.methods.createSwap(...values).send(params)
        .on('transactionHash', (hash) => {
          if (typeof handleTransactionHash === 'function') {
            handleTransactionHash(hash)
          }
        })
        .on('error', (err) => {
          reject(err)
        })

      resolve(receipt)
    })
  }

  /**
   *
   * @param {object} data
   * @param {object} data.myAddress
   * @param {string} data.secret
   * @param {string} data.ownerAddress
   * @param {function} handleTransactionHash
   */
  withdraw(data, handleTransactionHash) {
    const { myAddress, ownerAddress, secret } = data

    return new Promise(async (resolve, reject) => {
      const _secret = `0x${secret.replace(/^0x/, '')}`

      const params = {
        from: myAddress,
        gas: this.gasLimit,
      }

      const receipt = await this.contract.methods.withdraw(_secret, ownerAddress).send(params)
        .on('transactionHash', (hash) => {
          if (typeof handleTransactionHash === 'function') {
            handleTransactionHash(hash)
          }
        })
        .on('error', (err) => {
          reject(err)
        })

      resolve(receipt)
    })
  }

  refund() {
    // TODO write refund functional
  }

  getSecret({ myAddress, participantAddress }) {
    return new Promise(async (resolve, reject) => {
      let secret

      try {
        secret = await this.contract.methods.getSecret(participantAddress).call({
          from: myAddress,
        })
      }
      catch (err) {
        reject(err)
      }

      resolve(secret)
    })
  }

  close({ myAddress, participantAddress }, handleTransactionHash) {
    return new Promise(async (resolve, reject) => {
      const params = {
        from: myAddress,
        gas: this.gasLimit,
      }

      const receipt = await this.contract.methods.close(participantAddress).send(params)
        .on('transactionHash', (hash) => {
          if (typeof handleTransactionHash === 'function') {
            handleTransactionHash(hash)
          }
        })
        .on('error', (err) => {
          reject(err)
        })

      resolve(receipt)
    })
  }
}


export default EthSwap
