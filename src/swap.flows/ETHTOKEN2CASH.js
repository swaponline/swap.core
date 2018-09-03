import crypto from 'bitcoinjs-lib/src/crypto' // move to BtcSwap
import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'


export default (tokenName) => {

  class ETHTOKEN2CASH extends Flow {

    static getName() {
      return `${tokenName.toUpperCase()}2${constants.COINS.cash}`
    }

    constructor(swap) {
      super(swap)

      this._flowName = ETHTOKEN2CASH.getName()

      this.ethTokenSwap = SwapApp.swaps[tokenName.toUpperCase()]
      this.cashSwap     = SwapApp.swaps[constants.COINS.cash]

      this.myEthAddress = SwapApp.services.auth.accounts.eth.address

      this.stepNumbers = {
        'sign': 1,
        'wait-lock-btc': 2,
        'verify-script': 3,
        'sync-balance': 4,
        'lock-eth': 5,
        'wait-withdraw-eth': 6, // aka getSecret
        'withdraw-cash': 7,
        'finish': 8,
        'end': 9
      }

      if (!this.ethTokenSwap) {
        throw new Error('ETHTOKEN2CASH: "ethTokenSwap" of type object required')
      }
      if (!this.cashSwap) {
        throw new Error('ETHTOKEN2CASH: "cashSwap" of type object required')
      }

      this.state = {
        step: 0,

        isSignFetching: false,
        isMeSigned: false,

        secretHash: null,

        isCashLocked: false,
        isCashLockVerified: false,

        isBalanceFetching: false,
        isBalanceEnough: false,
        balance: null,

        isEthContractFunded: false,
        isEthWithdrawn: false,

        ethSwapCreationTransactionHash: null,
        ethSwapWithdrawTransactionHash: null,

        secret: null,

        isCashWithdrawn: false,

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

      return [

        // 1. Sign swap to start

        () => {
          // this.sign()
        },

        // 2. Wait participant create, fund CASH Script

        () => {
          flow.swap.room.once('lock cash', ({ secretHash }) => {
            flow.setState({
              secretHash,
            })

            flow.finishStep({
              isCashLocked: true
            })
          })
        },

        // 3. Verify CASH

        () => {
          // this.verifyCashLocked()
        },

        // 4. Check balance

        () => {
          this.syncBalance()
        },

        // 5. Create ETH Contract

        async () => {
          const { participant, buyAmount, sellAmount } = flow.swap
          let ethSwapCreationTransactionHash

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

          const checkSecretExist = async () => {
            try {
              const secret = await flow.ethTokenSwap.getSecret({
                participantAddress: participant.eth.address,
              })

              if (secret) {
                clearInterval(checkSecretTimer)

                if (!flow.state.secret) {
                  flow.finishStep({
                    secret,
                    isEthWithdrawn: true,
                  })
                }
              }
            }
            catch (err) { console.error(err) }
          }

          const checkSecretTimer = setInterval(checkSecretExist, 5000)

          flow.swap.room.once('finish eth withdraw', () => {
            checkSecretExist()
          })
        },

        // 7. Withdraw

        async () => {
          const { participant } = flow.swap
          const { secret, secretHash } = flow.state

          const data = {
            participantAddress: participant.eth.address,
          }

          // if there is still no secret stop withdraw
          if (!secret) {
            console.error(`Secret required! Got ${secret}`)
            return
          }

          await flow.cashSwap.withdraw({
            secret,
            secretHash,
          })

          flow.finishStep({
            isCashWithdrawn: true,
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
      })

      return true
    }

    verifyCashLocked() {
      if (this.state.isCashLockVerified) return true
      if (!this.state.isCashLocked)
        throw new Error(`No message, cannot verify`)

      this.finishStep({
        isCashLockVerified: true,
      })
    }

    async syncBalance() {
      const { sellAmount } = this.swap

      if (this.state.isBalanceEnough) return

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
        })
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
      const { secret, secretHash, isEthWithdrawn, isCashWithdrawn } = this.state

      if (!_secret)
        throw new Error(`Withdrawal is automatic. For manual withdrawal, provide a secret`)

      if (secret && secret != _secret)
        console.warn(`Secret already known and is different. Are you sure?`)

      if (isCashWithdrawn)
        console.warn(`Looks like money were already withdrawn, are you sure?`)

      console.log(`WITHDRAW using secret = ${_secret}`)

      const _secretHash = crypto.ripemd160(Buffer.from(_secret, 'hex')).toString('hex')

      if (secretHash != _secretHash)
        console.warn(`Hash does not match!`)

      await this.cashSwap.withdraw({
        secret,
        secretHash,
      })

      this.finishStep({
        isCashWithdrawn: true,
      })
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

  return ETHTOKEN2CASH
}
