import SwapApp, { SwapInterface, constants } from 'swap.app'
import BigNumber from 'bignumber.js'
import InputDataDecoder from 'ethereum-input-data-decoder'


class EthTokenSwap extends SwapInterface {

  /**
   *
   * @param {object}    options
   * @param {string}    options.name
   * @param {string}    options.address
   * @param {array}     options.abi
   * @param {string}    options.tokenAddress
   * @param {array}     options.tokenAbi
   * @param {number}    options.gasLimit
   * @param {function}  options.fetchBalance
   */
  constructor(options) {
    super()

    if (!options.name) {
      throw new Error('EthTokenSwap: "name" required')
    }
    if (!Object.values(constants.COINS).includes(options.name.toUpperCase())) {
      throw new Error('EthTokenSwap: "name" should be correct')
    }
    if (typeof options.address !== 'string') {
      throw new Error('EthTokenSwap: "address" required')
    }
    if (typeof options.decimals !== 'number') {
      throw new Error('EthTokenSwap: "decimals" required')
    }
    if (!Array.isArray(options.abi)) {
      throw new Error('EthTokenSwap: "abi" required')
    }
    if (typeof options.tokenAddress !== 'string') {
      throw new Error('EthTokenSwap: "tokenAddress" required')
    }
    if (!Array.isArray(options.tokenAbi)) {
      throw new Error('EthTokenSwap: "tokenAbi" required')
    }


    this._swapName      = options.name.toUpperCase()

    this.address        = options.address
    this.abi            = options.abi
    this.decimals       = options.decimals
    this.tokenAddress   = options.tokenAddress
    this.tokenAbi       = options.tokenAbi

    this.gasLimit       = options.gasLimit || 2e5
    this.gasPrice       = options.gasPrice || 2e9
    this.fetchBalance   = options.fetchBalance
  }

  _initSwap() {
    this.decoder        = new InputDataDecoder(this.abi)
    this.contract       = new SwapApp.env.web3.eth.Contract(this.abi, this.address)
    this.ERC20          = new SwapApp.env.web3.eth.Contract(this.tokenAbi, this.tokenAddress)
  }

  async updateGas() {
    try {
      await SwapApp.env.web3.eth.getGasPrice((err, _gasPrice) => {
        const newGas = new BigNumber(String(_gasPrice)).plus(new BigNumber(String(1300000000)))
        this.gasPrice = Number(newGas)
      })
    }
    catch(err) {
      console.error(`${err.name}: ${err.message}`)
      this.gasPrice = 15e9
    }
  }


  /**
   *
   * @param {object} data
   * @param {BigNumber} data.amount
   * @param {function} handleTransactionHash
   * @returns {Promise}
   */
  async approve(data, handleTransactionHash) {
    const { amount } = data
    const newAmount = new BigNumber(String(amount)).times(new BigNumber(10).pow(this.decimals)).decimalPlaces(this.decimals).toNumber()

    await this.updateGas()

    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.ERC20.methods.approve(this.address, newAmount).send({
          from: SwapApp.services.auth.accounts.eth.address,
          gas: this.gasLimit,
          gasPrice: this.gasPrice,
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
   * @param {string} data.owner
   * @param {string} data.spender
   * @returns {Promise}
   */
  checkAllowance(data) {
    const { spender } = data

    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.ERC20.methods.allowance(spender, this.address).call({
          from: SwapApp.services.auth.accounts.eth.address,
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
   * @param {string} data.secretHash
   * @param {string} data.participantAddress
   * @param {BigNumber} data.amount
   * @param {function} handleTransactionHash
   * @returns {Promise}
   */
  async create(data, handleTransactionHash) {
    const { secretHash, participantAddress, amount , targetWallet } = data
    const newAmount = new BigNumber(String(amount)).times(new BigNumber(10).pow(this.decimals)).decimalPlaces(this.decimals).toNumber()

    await this.updateGas()

    return new Promise(async (resolve, reject) => {
      const hash    = `0x${secretHash.replace(/^0x/, '')}`

      const values  = (targetWallet && (targetWallet!==participantAddress)) ?
        [ hash , participantAddress, targetWallet , newAmount, this.tokenAddress ]
        :
        [ hash, participantAddress, newAmount, this.tokenAddress ]

      const params  = {
        from: SwapApp.services.auth.accounts.eth.address,
        gas: this.gasLimit,
        gasPrice: this.gasPrice,
      }

      const contractMethod = (targetWallet && (targetWallet!==participantAddress)) ? 'createSwapTarget' : 'createSwap'

      try {
        console.log("Get gas fee");
        const gasFee = await this.contract.methods[contractMethod](...values).estimateGas(params)
        params.gas = gasFee;
        console.log("EthTokenSwap -> create -> gasFee",gasFee);
        const result = await this.contract.methods[contractMethod](...values).send(params)
          .on('transactionHash', (hash) => {
            if (typeof handleTransactionHash === 'function') {
              handleTransactionHash(hash)
            }
          })
          .on('error', (err) => {
            reject(err)
          })
        console.log('result', result)
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
      console.log('balance', balance)
      resolve(balance)
    })
  }

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
   * @param {string} participantAddress
   * @param {string} newTargetWallet
   * @param {function} handleTransactionHash
   */
  async setTargetWallet(participantAddress, newTargetWallet, handleTransactionHash) {
    // ---
  }
  async getTargetWallet(ownerAddress) {
    console.log('EthTokenSwap->getTargetWallet');
    return new Promise(async (resolve, reject) => {
      try {
        const targetWallet = await this.contract.methods.getTargetWallet(ownerAddress).call({
          from: SwapApp.services.auth.accounts.eth.address,
        })
        console.log('EthTokenSwap->getTargetWallet',targetWallet);

        resolve(targetWallet)
      }
      catch (err) {
        reject(err)
      }
    })
  }
  /**
   *
   * @param {object} data
   * @param {string} data.secret
   * @param {string} data.ownerAddress
   * @param {function} handleTransactionHash
   * @returns {Promise}
   */
  async withdraw(data, handleTransactionHash) {
    const { ownerAddress, secret } = data

    await this.updateGas()

    return new Promise(async (resolve, reject) => {
      const _secret = `0x${secret.replace(/^0x/, '')}`

      const params = {
        from: SwapApp.services.auth.accounts.eth.address,
        gas: this.gasLimit,
        gasPrice: this.gasPrice,
      }

      try {
        const gasFee = await this.contract.methods.withdraw(_secret, ownerAddress).estimateGas(params);
        console.log("EthTokenSwap -> withdraw -> gasFee",gasFee);
        params.gas = gasFee;
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

  /**
   *
   * @param {object} data
   * @param {string} data.participantAddress
   * @param {function} handleTransactionHash
   * @returns {Promise}
   */
  async refund(data, handleTransactionHash) {
    const { participantAddress } = data

    await this.updateGas()

    return new Promise(async (resolve, reject) => {
      const params = {
        from: SwapApp.services.auth.accounts.eth.address,
        gas: this.gasLimit,
        gasPrice: this.gasPrice,
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

        const secretValue = secret && !/^0x0+/.test(secret) ? secret : null

        resolve(secretValue)
      }
      catch (err) {
        reject(err)
      }
    })
  }


  /**
   *
   * @param {string} transactionHash
   * @returns {Promise<any>}
   */
  getSecretFromTxhash = (transactionHash) =>
    this.repeatToTheResult(9, () => SwapApp.env.web3.eth.getTransaction(transactionHash)
      .then(txResult => {
        try {
          const bytes32 = this.decoder.decodeData(txResult.input)
          return SwapApp.env.web3.utils.bytesToHex(bytes32.inputs[0]).split('0x')[1]
        } catch (err) {
          console.error(err)
          return
        }
      }))

}


export default EthTokenSwap
