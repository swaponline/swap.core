import SwapApp, { SwapInterface } from '../swap.app'


class EthTokenSwap extends SwapInterface {

  /**
   *
   * @param {object}    options
   * @param {string}    options.address
   * @param {array}     options.abi
   * @param {string}    options.tokenAddress
   * @param {array}     options.tokenAbi
   * @param {number}    options.gasLimit
   * @param {function}  options.fetchBalance
   */
  constructor(options) {
    super()

    if (typeof options.address !== 'function') {
      throw new Error('EthTokenSwap: "address" required')
    }
    if (typeof options.abi !== 'function') {
      throw new Error('EthTokenSwap: "abi" required')
    }
    if (typeof options.address !== 'function') {
      throw new Error('EthTokenSwap: "tokenAddress" required')
    }
    if (typeof options.abi !== 'function') {
      throw new Error('EthTokenSwap: "tokenAbi" required')
    }

    this._swapName      = 'ethTokenSwap'

    this.address        = options.address
    this.abi            = options.abi
    this.tokenAddress   = options.tokenAddress
    this.tokenAbi       = options.tokenAbi

    this.gasLimit       = options.gasLimit || 3e6
    this.fetchBalance   = options.fetchBalance
  }

  _initSwap() {
    this.contract       = new SwapApp.env.web3.eth.Contract(this.abi, this.address)
    this.ERC20          = new SwapApp.env.web3.eth.Contract(this.tokenAbi, this.tokenAddress)
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

      try {
        const result = await this.contract.methods.sign(participantAddress).send(params)
          .on('transactionHash', (hash) => {
            if (typeof handleTransactionHash === 'function') {
              handleTransactionHash(hash)
            }
          })
          .on('error', (err) => {
            reject(err)
          })

        resolve(result)
      }
      catch (err) {
        reject(err)
      }
    })
  }

  approve({ myAddress, amount }, handleTransactionHash) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.ERC20.methods.approve(this.address, amount).send({
          from: myAddress,
          gas: this.gasLimit,
        })
          .on('transactionHash', (hash) => {
            if (typeof handleTransactionHash === 'function') {
              handleTransactionHash(hash)
            }
          })
          .on('error', err => {
            reject(err)
          })

        resolve(result)
      }
      catch (err) {
        reject(err)
      }
    })
  }

  /**
   *
   * @param {object} data
   * @param {string} data.myAddress
   * @param {string} data.owner
   * @param {string} data.spender
   * @returns {Promise}
   */
  checkAllowance(data) {
    const { myAddress, owner, spender } = data

    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.ERC20.methods.allowance(owner, spender).call({
          from: myAddress,
        })

        resolve(result)
      }
      catch (err) {
        reject(err)
      }
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
      const hash    = `0x${secretHash.replace(/^0x/, '')}`
      const values  = [ hash, participantAddress, amount, this.tokenAddress ]
      const params  = { from: myAddress, gas: this.gasLimit }

      try {
        const result = await this.contract.methods.createSwap(...values).send(params)
          .on('transactionHash', (hash) => {
            if (typeof handleTransactionHash === 'function') {
              handleTransactionHash(hash)
            }
          })
          .on('error', (err) => {
            reject(err)
          })

        resolve(result)
      }
      catch (err) {
        reject(err)
      }
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

      try {
        const result = await this.contract.methods.withdraw(_secret, ownerAddress).send(params)
          .on('transactionHash', (hash) => {
            if (typeof handleTransactionHash === 'function') {
              handleTransactionHash(hash)
            }
          })
          .on('error', (err) => {
            reject(err)
          })

        resolve(result)
      }
      catch (err) {
        reject(err)
      }
    })
  }

  refund() {
    // TODO write refund functional
  }

  /**
   *
   * @param {object} data
   * @param {string} data.myAddress
   * @param {string} data.participantAddress
   * @returns {Promise}
   */
  getSecret(data) {
    const { myAddress, participantAddress } = data

    return new Promise(async (resolve, reject) => {
      try {
        const secret = await this.contract.methods.getSecret(participantAddress).call({
          from: myAddress,
        })

        resolve(secret)
      }
      catch (err) {
        reject(err)
      }
    })
  }

  /**
   *
   * @param {object} data
   * @param {string} data.myAddress
   * @param {string} data.participantAddress
   * @param handleTransactionHash
   * @returns {Promise}
   */
  close(data, handleTransactionHash) {
    const { myAddress, participantAddress } = data

    return new Promise(async (resolve, reject) => {
      const params = {
        from: myAddress,
        gas: this.gasLimit,
      }

      try {
        const result = await this.contract.methods.close(participantAddress).send(params)
          .on('transactionHash', (hash) => {
            if (typeof handleTransactionHash === 'function') {
              handleTransactionHash(hash)
            }
          })
          .on('error', (err) => {
            reject(err)
          })

        resolve(result)
      }
      catch (err) {
        reject(err)
      }
    })
  }
}


export default EthTokenSwap
