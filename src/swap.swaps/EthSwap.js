import SwapApp, {constants, SwapInterface} from 'swap.app'
import BigNumber from 'bignumber.js'
import InputDataDecoder from 'ethereum-input-data-decoder'


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
    if (typeof options.address !== 'string') {
      throw new Error('EthSwap: "address" required')
    }
    if (!Array.isArray(options.abi)) {
      throw new Error('EthSwap: "abi" required')
    }

    this.address        = options.address
    this.abi            = options.abi

    this._swapName      = constants.COINS.eth
    this.gasLimit       = options.gasLimit || 3e6
    this.gasPrice       = options.gasPrice || 2e9
    this.fetchBalance   = options.fetchBalance
  }

  _initSwap() {
    this.decoder  = new InputDataDecoder(this.abi)
    this.contract = new SwapApp.env.web3.eth.Contract(this.abi, this.address)
  }

  /**
   *
   * @param {object} data
   * @param {string} data.secretHash
   * @param {string} data.participantAddress
   * @param {number} data.amount
   * @param {function} handleTransactionHash
   * @returns {Promise}
   */
  create(data, handleTransactionHash) {
    const { secretHash, participantAddress, amount } = data

    const base = BigNumber(10).pow(18)
    const newAmount = new BigNumber(amount.toString()).times(base).integerValue().toNumber()

    return new Promise(async (resolve, reject) => {
      const hash = `0x${secretHash.replace(/^0x/, '')}`

      const params = {
        from: SwapApp.services.auth.accounts.eth.address,
        gas: this.gasLimit,
        value: newAmount,
        gasPrice: this.gasPrice,
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
   * @param {string} value
   */
  addGasPrice = (value) => {
    value = value.toNumber()
    this.gasPrice = value
  }

  /**
   *
   * @param {object} data
   * @param {string} data.ownerAddress
   * @returns {Promise}
   */
  getBalance(data) {
    const { ownerAddress } = data

    return new Promise(async (resolve, reject) => {
      let balance

      try {
        balance = await this.contract.methods.getBalance(ownerAddress).call({
          from: SwapApp.services.auth.accounts.eth.address,
        })
      }
      catch (err) {
        reject(err)
      }

      resolve(balance)
    })
  }

  /**
   *
   * @param {object} data
   * @param {string} data.ownerAddress
   * @param {string} data.participantAddress
   * @returns {Promise}
   */
  checkSwapExists(data) {
    const { ownerAddress, participantAddress } = data

    return new Promise(async (resolve, reject) => {
      let swap

      try {
        swap = await this.contract.methods.swaps(ownerAddress, participantAddress).call()
      }
      catch (err) {
        reject(err)
      }

      console.log('swapExists', swap)

      const balance = parseInt(swap.balance)
      resolve(balance)
    })
  }


  /**
   *
   * @param {number} repeat
   * @param {function} action
   * @param delay
   * @returns {Promise<any>}
   */
  repeatToTheResult = (repeat, action, delay = 5000) =>
    new Promise(async (resolve, reject) => {
      let result = await action()

      if (result === 0 || typeof result === 'undefined' || result === null) {
        if (repeat > 0) {
          repeat--
          setTimeout(async () => {
            result = await this.repeatToTheResult(repeat, action)
            resolve(result)
          }, delay)
        }
      } else {
        resolve(result)
      }
    })


  /**
   *
   * @param {object} data
   * @param {string} data.ownerAddress
   * @param {BigNumber} data.expectedValue
   * @returns {Promise.<string>}
   */
  async checkBalance(data) {
    const { ownerAddress, expectedValue } = data
    let balance = await this.repeatToTheResult(9, () => this.getBalance({ ownerAddress }))


    if (expectedValue.isGreaterThan(balance)) {
      return `Expected value: ${expectedValue.toNumber()}, got: ${balance}`
    }
  }

  /**
   *
   * @param {object} data
   * @param {string} data.secret
   * @param {string} data.ownerAddress
   * @param {function} handleTransactionHash
   * @returns {Promise}
   */
  withdraw(data, handleTransactionHash) {
    const { ownerAddress, secret } = data

    return new Promise(async (resolve, reject) => {
      const _secret = `0x${secret.replace(/^0x/, '')}`

      const params = {
        from: SwapApp.services.auth.accounts.eth.address,
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

  /**
   *
   * @param {object} data
   * @param {string} data.participantAddress
   * @param {function} handleTransactionHash
   * @returns {Promise}
   */
  refund(data, handleTransactionHash) {
    const { participantAddress } = data

    return new Promise(async (resolve, reject) => {
      const params = {
        from: SwapApp.services.auth.accounts.eth.address,
        gas: this.gasLimit,
      }

      const receipt = await this.contract.methods.refund(participantAddress).send(params)
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
   * @param {string} data.participantAddress
   * @returns {Promise}
   */
  getSecret(data) {
    const { participantAddress } = data

    return new Promise(async (resolve, reject) => {
      try {
        const secret = await this.contract.methods.getSecret(participantAddress).call({
          from: SwapApp.services.auth.accounts.eth.address,
        })

        console.log('secret ethswap.js', secret)

        const secretValue = secret && !/^0x0+/.test(secret) ? secret : null

        resolve(secretValue)
      }
      catch (err) {
        reject(err)
      }
    })
  }


/*
  Function: withdraw(bytes32 _secret, address _ownerAddress)
  bytes32 {...}
  inputs: (2) […]
    0: Uint8Array(32) [ 208, 202, 170, … ]
    1: "e918c8719bae0525786548b8da7fbef9b33d4e25"
  name: "withdraw"
  types: (2) […]
    0: "bytes32"
    1: "address"
*/

  /**
   *
   * @param {string} transactionHash
   * @returns {Promise<any>}
   */
  getSecretFromTxhash = (transactionHash) =>
    this.repeatToTheResult(9, () => SwapApp.env.web3.eth.getTransaction(transactionHash)
      .then(txResult => {
        const bytes32 = this.decoder.decodeData(txResult.input)
        console.log('bytes32', bytes32)
        return SwapApp.env.web3.utils.bytesToHex(bytes32.inputs[0]).split('0x')[1]
      }))

  /**
   *
   * @param {object} data
   * @param {string} data.participantAddress
   * @param handleTransactionHash
   * @returns {Promise}
   */
  close(data, handleTransactionHash) {
    const { participantAddress } = data

    return new Promise(async (resolve, reject) => {
      const params = {
        from: SwapApp.services.auth.accounts.eth.address,
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


export default EthSwap

// /**
//  *
//  * @param {object} data
//  * @param {string} data.participantAddress
//  * @param {function} handleTransactionHash
//  * @returns {Promise}
//  */
// sign(data, handleTransactionHash) {
//   const { participantAddress } = data
//
//   return new Promise(async (resolve, reject) => {
//     const params = {
//       from: SwapApp.services.auth.accounts.eth.address,
//       gas: this.gasLimit,
//     }
//
//     const receipt = await this.contract.methods.sign(participantAddress).send(params)
//       .on('transactionHash', (hash) => {
//         if (typeof handleTransactionHash === 'function') {
//           handleTransactionHash(hash)
//         }
//       })
//       .on('error', (err) => {
//         reject(err)
//       })
//
//     resolve(receipt)
//   })
// }
