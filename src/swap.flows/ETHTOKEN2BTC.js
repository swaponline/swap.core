import crypto from 'bitcoinjs-lib/src/crypto' // move to BtcSwap
import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'


export default (tokenName) => {

  class ETHTOKEN2BTC extends Flow {

    static getName() {
      return `${this.getFromName()}2${this.getToName()}`
    }
	static getFromName() {
	  return `${tokenName.toUpperCase()}`
	}
	static getToName() {
	  return constants.COINS.btc;
	}

    constructor(swap) {
      super(swap)

      this._flowName = ETHTOKEN2BTC.getName()

      this.ethTokenSwap = SwapApp.swaps[tokenName.toUpperCase()]
      this.btcSwap      = SwapApp.swaps[constants.COINS.btc]

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

      if (!this.ethTokenSwap) {
        throw new Error('ETHTOKEN2BTC: "ethTokenSwap" of type object required')
      }
      if (!this.btcSwap) {
        throw new Error('ETHTOKEN2BTC: "btcSwap" of type object required')
      }

      this.state = {
        step: 0,

        signTransactionHash: null,
        isSignFetching: false,
        isMeSigned: false,

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
      console.log('FLOW', flow)

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

          flow.swap.room.sendMessage({
            event: 'request btc script',
          })
        },

        // 3. Verify BTC Script

        () => {
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

          await flow.ethTokenSwap.approve({
            amount: sellAmount,
          })

          await flow.ethTokenSwap.create(swapData, (hash) => {
            ethSwapCreationTransactionHash = hash

            flow.setState({
              ethSwapCreationTransactionHash: hash,
            })
          })

          flow.swap.room.sendMessage({
            event: 'create eth contract',
            data: {
              ethSwapCreationTransactionHash,
            },
          })

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
                secret = await flow.ethTokenSwap.getSecret({
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
          let { secret } = flow.state

          const data = {
            participantAddress: participant.eth.address,
          }

          // if there is no secret in state then request it
          if (!secret) {
            try {
              secret = await flow.ethTokenSwap.getSecret(data)

              flow.setState({
                secret,
              })
            }
            catch (err) {
              // TODO notify user that smth goes wrong
              if ( !/known transaction/.test(err.message) )
                console.error(err)
              return
            }
          }

          // if there is still no secret stop withdraw
          if (!secret) {
            console.error(`Secret required! Got ${secret}`)
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
          flow.swap.room.sendMessage({
            event: 'swap finished',
          })

          flow.finishStep({
            isFinished: true
          })
        },

        // 9. Finished!

        () => {

        },
      ]
    }

    _checkSwapAlreadyExists() {
      const { participant } = this.swap

      const swapData = {
        ownerAddress:       SwapApp.services.auth.accounts.eth.address,
        participantAddress: participant.eth.address
      }

      return this.ethTokenSwap.checkSwapExists(swapData)
    }

    async sign() {
      const { participant } = this.swap
      const { isMeSigned } = this.state

      if (isMeSigned) return this.swap.room.sendMessage({
        event: 'swap sign',
      })

      const swapExists = await this._checkSwapAlreadyExists()

      if (swapExists) {
        this.swap.room.sendMessage({
          event: 'swap exists',
        })
        // TODO go to 6 step automatically here
        throw new Error(`Cannot sign: swap with ${participant.eth.address} already exists! Please refund it or drop ${this.swap.id}`)
        return false
      }

      this.setState({
        isSignFetching: true,
      })

      this.swap.room.once('request sign', () => {
        this.swap.room.sendMessage({
          event: 'swap sign',
        })
      })

      this.swap.room.sendMessage({
        event: 'swap sign',
      })

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

      const balance = await this.ethTokenSwap.fetchBalance(SwapApp.services.auth.accounts.eth.address)
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

    async tryRefund() {
      const { participant } = this.swap
      let { secret, btcScriptValues } = this.state

      try {
        console.log('TRYING REFUND!')

        try {
          await this.ethTokenSwap.refund({
            participantAddress: participant.eth.address,
          }, (hash) => {
            this.setState({
              refundTransactionHash: hash,
            })
          })

          console.log('SUCCESS REFUND!')
          return
        }
        catch (err) {
          console.err('REFUND FAILED!', err)
        }
      }
      catch (err) {
        console.error(`Mbe it's still under lockTime?! ${err}`)
      }

      if (!btcScriptValues) {
        console.error('You can\'t do refund w/o btc script values! Try wait until lockTime expires on eth contract!')
      }

      if (!secret) {
        try {
          secret = await this.ethTokenSwap.getSecret(data)
        }
        catch (err) {
          console.error('Can\'t receive secret from contract')
          return
        }
      }

      console.log('TRYING WITHDRAW!')

      try {
        await this.btcSwap.withdraw({
          scriptValues: this.state.btcScriptValues,
          secret,
        }, (hash) => {
          this.setState({
            btcSwapWithdrawTransactionHash: hash,
          })
        })

        console.log('SUCCESS WITHDRAW!')
      }
      catch (err) {
        console.error('WITHDRAW FAILED!', err)
      }
    }
  }

  return ETHTOKEN2BTC
}
