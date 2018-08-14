import crypto from 'bitcoinjs-lib/src/crypto' // move to BtcSwap
import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'


class ETH2BTC extends Flow {

  static getName() {
    return `${constants.COINS.eth}2${constants.COINS.btc}`
  }

  constructor(swap) {
    super(swap)

    this._flowName = ETH2BTC.getName()

    this.ethSwap = SwapApp.swaps[constants.COINS.eth]
    this.btcSwap = SwapApp.swaps[constants.COINS.btc]

    this.myBtcAddress = SwapApp.services.auth.accounts.btc.getAddress()
    this.myEthAddress = SwapApp.services.auth.accounts.eth.address

    this.stepNumbers = {
      'sign': 1,
      'wait-lock-btc': 2,
      'verify-script': 3,
      'sync-balance': 4,
      'lock-eth': 5,
      'wait-withdraw-eth': 6, // aka getSecret
      'withdraw-btc': 7,
      'finish': 8,
      'end': 9
    }

    if (!this.ethSwap) {
      throw new Error('BTC2ETH: "ethSwap" of type object required')
    }
    if (!this.btcSwap) {
      throw new Error('BTC2ETH: "btcSwap" of type object required')
    }

    this.state = {
      step: 0,

      signTransactionHash: null,
      isSwapExists: false,
      isSignFetching: false,
      isMeSigned: false,
      lastSwapTime: null,

      secretHash: null,
      btcScriptValues: null,

      btcScriptVerified: false,

      isBalanceFetching: false,
      isBalanceEnough: false,
      balance: null,

      btcScriptCreatingTransactionHash: null,
      ethSwapCreationTransactionHash: null,

      isEthContractFunded: false,

      secret: null,

      isEthWithdrawn: false,
      isBtcWithdrawn: false,

      refundTransactionHash: null,
      isRefunded: false,

      isFinished: false,
    }

    super._persistSteps()
    this._persistState()
  }

  _persistState() {
    super._persistState()
  }

  _getSteps() {
    const flow = this

    return [

      // 1. Sign swap to start

      () => {
        // this.sign()
      },

      // 2. Wait participant create, fund BTC Script

      () => {
        flow.swap.room.once('create btc script', ({ scriptValues, btcScriptCreatingTransactionHash }) => {
          flow.finishStep({
            secretHash: scriptValues.secretHash,
            btcScriptValues: scriptValues,
            btcScriptCreatingTransactionHash,
          }, { step: 'wait-lock-btc', silentError: true })
        })

        flow.swap.room.sendMessage('request btc script')
        console.log(`request btc script`)
      },

      // 3. Verify BTC Script

      () => {
        console.log(`waiting verify btc script`)
        // this.verifyBtcScript()
      },

      // 4. Check balance

      () => {
        this.syncBalance()
      },

      // 5. Create ETH Contract

      async () => {
        const { participant, buyAmount, sellAmount } = flow.swap
        let ethSwapCreationTransactionHash

        // TODO move this somewhere!
        const utcNow = () => Math.floor(Date.now() / 1000)
        const getLockTime = () => utcNow() + 3600 * 1 // 1 hour from now

        const scriptCheckResult = await flow.btcSwap.checkScript(flow.state.btcScriptValues, {
          value: buyAmount,
          recipientPublicKey: SwapApp.services.auth.accounts.btc.getPublicKey(),
          lockTime: getLockTime(),
        })

        if (scriptCheckResult) {
          console.error(`Btc script check error:`, scriptCheckResult)
          flow.swap.events.dispatch('btc script check error', scriptCheckResult)
          return
        }

        const swapData = {
          participantAddress:   participant.eth.address,
          secretHash:           flow.state.secretHash,
          amount:               sellAmount,
        }

        try {
          await this.ethSwap.create(swapData, (hash) => {
            ethSwapCreationTransactionHash = hash

            flow.setState({
              ethSwapCreationTransactionHash: hash,
            })
          })
        } catch (err) {
          // TODO user can stuck here after page reload...
          if ( /known transaction/.test(err.message) )
            return console.error(`known tx: ${err.message}`)
          else if ( /out of gas/.test(err.message) )
            return console.error(`tx failed (wrong secret?): ${err.message}`)
          else
            return console.error(err)
        }
        
        console.log(`create ETH contract, hash=${ethSwapCreationTransactionHash}`)

        flow.swap.room.sendMessage('create eth contract', {
          ethSwapCreationTransactionHash,
        })

        console.log(`finish step`)

        flow.finishStep({
          isEthContractFunded: true,
        })
      },

      // 6. Wait participant withdraw

      () => {
        const { participant } = flow.swap
        let timer

        const checkSecretExist = () => {
          timer = setTimeout(async () => {
            let secret

            try {
              secret = await flow.ethSwap.getSecret({
                participantAddress: participant.eth.address,
              })
            }
            catch (err) {}

            if (secret) {
              if (!flow.state.isEthWithdrawn) { // redundant condition but who cares :D
                flow.finishStep({
                  isEthWithdrawn: true,
                  secret,
                }, { step: 'wait-withdraw-eth' })
              }
            }
            else {
              checkSecretExist()
            }
          }, 20 * 1000)
        }

        checkSecretExist()

        flow.swap.room.once('finish eth withdraw', () => {
          if (!flow.state.isEthWithdrawn) {
            clearTimeout(timer)
            timer = null

            flow.finishStep({
              isEthWithdrawn: true,
            }, { step: 'wait-withdraw-eth' })
          }
        })
      },

      // 7. Withdraw

      async () => {
        const { participant } = flow.swap
        let { secret, btcScriptValues } = flow.state
        console.log('secret withdraw 7', secret)
        console.log('btcScriptValues withdraw 7', btcScriptValues)

        if (!btcScriptValues) {
          console.error('There is no "btcScriptValues" in state. No way to continue swap...')
          return
        }

        // if there is no secret in state then request it
        if (!secret) {
          try {
            secret = await flow.ethSwap.getSecret({
              participantAddress: participant.eth.address,
            })

            flow.setState({
              secret,
            })
          }
          catch (err) {
            // TODO user can stuck here after page reload...
            if ( !/known transaction/.test(err.message) )
              return console.error(err)
          }
        }

        // if there is still no secret stop withdraw
        if (!secret) {
          // if there is no secret then there is a chance that user have already did withdraw, if balance === 0 it's ok
          const balance = await flow.btcSwap.getBalance(btcScriptValues)

          console.log('balance', balance)

          if (balance === 0) {
            console.log('Look like you already did withdraw')

            flow.finishStep({
              isBtcWithdrawn: true,
            })

            return
          }

          console.error(`FAIL! secret: ${secret}, balance: ${balance}`)
          return
        }

        await flow.btcSwap.withdraw({
          scriptValues: flow.state.btcScriptValues,
          secret,
        }, (hash) => {
          flow.setState({
            btcSwapWithdrawTransactionHash: hash,
          })
        })

        flow.finishStep({
          isBtcWithdrawn: true,
        })
      },

      // 8. Finish

      () => {
        flow.swap.room.sendMessage('swap finished')

        flow.finishStep({
          isFinished: true,
        })
      },

      // 9. Finished!
      () => {

      }
    ]
  }

  _checkSwapAlreadyExists() {
    const { participant } = this.swap

    const swapData = {
      ownerAddress:       SwapApp.services.auth.accounts.eth.address,
      participantAddress: participant.eth.address
    }

    return this.ethSwap.checkSwapExists(swapData)
  }

  async sign() {
    const { participant } = this.swap
    const { isMeSigned } = this.state

    if (isMeSigned) return this.swap.room.sendMessage('swap sign')

    const swapExists = await this._checkSwapAlreadyExists()

    this.setState({
      isSwapExists: false,
      isRefunded: false,
      lastSwapTime: null
    })

    if (swapExists.balance) {
      this.swap.room.sendMessage('swap exists')
      this.setState({
        isSwapExists: true,
        lastSwapTime: swapExists.createdTime
      })
      this.swap.room.once('user2 refund', () => {
        this.sign();
      })
      // TODO go to 6 step automatically here
      throw new Error(`Cannot sign: swap with ${participant.eth.address} already exists! Please refund it or drop ${this.swap.id}`)
      return false
    }

    this.setState({
      isSignFetching: true,
    })

    this.swap.room.once('request sign', () => {
      this.swap.room.sendMessage('swap sign')
    })

    this.swap.room.sendMessage('swap sign')

    this.finishStep({
      isMeSigned: true,
    }, { step: 'sign' })

    return true
  }


  verifyBtcScript() {
    if (this.state.btcScriptVerified) return true
    if (!this.state.btcScriptValues)
      throw new Error(`No script, cannot verify`)

    this.finishStep({
      btcScriptVerified: true,
    }, { step: 'verify-script' })

    return true
  }

  async syncBalance() {
    const { sellAmount } = this.swap

    this.setState({
      isBalanceFetching: true,
    })

    const balance = await this.ethSwap.fetchBalance(SwapApp.services.auth.accounts.eth.address)
    const isEnoughMoney = sellAmount.isLessThanOrEqualTo(balance)

    if (isEnoughMoney) {
      this.finishStep({
        balance,
        isBalanceFetching: false,
        isBalanceEnough: true,
      }, { step: 'sync-balance' })
    }
    else {
      this.setState({
        balance,
        isBalanceFetching: false,
        isBalanceEnough: false,
      })
    }
  }

  async tryWithdraw(_secret) {
    const { secret, secretHash, isEthWithdrawn, isBtcWithdrawn, btcScriptValues } = this.state

    if (!_secret)
      throw new Error(`Withdrawal is automatic. For manual withdrawal, provide a secret`)

    if (!btcScriptValues)
      throw new Error(`Cannot withdraw without script values`)

    if (secret && secret != _secret)
      console.warn(`Secret already known and is different. Are you sure?`)

    if (isBtcWithdrawn)
      console.warn(`Looks like money were already withdrawn, are you sure?`)

    console.log(`WITHDRAW using secret = ${_secret}`)

    const _secretHash = crypto.ripemd160(Buffer.from(_secret, 'hex')).toString('hex')

    if (secretHash != _secretHash)
      console.warn(`Hash does not match!`)

    const { scriptAddress } = this.btcSwap.createScript(btcScriptValues)

    const balance = await this.btcSwap.getBalance(scriptAddress)

    console.log(`address=${scriptAddress}, balance=${balance}`)

    if (balance === 0) {
      flow.finishStep({
        isBtcWithdrawn: true,
      }, { step: 'withdraw-btc' })

      throw new Error(`Already withdrawn: address=${scriptAddress},balance=${balance}`)
    }

    await this.btcSwap.withdraw({
      scriptValues: btcScriptValues,
      secret: _secret,
    }, (hash) => {
      console.log(`TX hash=${hash}`)
      this.setState({
        btcSwapWithdrawTransactionHash: hash,
      })
    })

    console.log(`TX withdraw sent: ${this.state.btcSwapWithdrawTransactionHash}`)

    this.finishStep({
      isBtcWithdrawn: true,
    }, { step: 'withdraw-btc' })
  }

  tryRefund() {
    const { participant } = this.swap

    this.ethSwap.refund({
      participantAddress: participant.eth.address,
    }, (hash) => {
      this.setState({
        refundTransactionHash: hash,
      })
    })
    .then(() => {
      this.setState({
        isRefunded: true,
      })
      this.swap.room.sendMessage('user1 refund')
    })
  }
}


export default ETH2BTC
