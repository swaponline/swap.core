import crypto from 'bitcoinjs-lib/src/crypto'
import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'


export default (tokenName) => {

  class CASH2ETHTOKEN extends Flow {

    static getName() {
      return `${constants.COINS.cash}2${tokenName.toUpperCase()}`
    }

    constructor(swap) {
      super(swap)

      this._flowName = CASH2ETHTOKEN.getName()

      this.ethTokenSwap = SwapApp.swaps[tokenName.toUpperCase()]
      this.cashSwap     = SwapApp.swaps[constants.COINS.cash]

      this.myEthAddress = SwapApp.services.auth.accounts.eth.address

      // this.stepNumbers = {
      //   'sign': 1,
      //   'submit-secret': 2,
      //   'sync-balance': 3,
      //   'lock-cash': 4,
      //   'wait-lock-eth': 5,
      //   'withdraw-eth': 6,
      //   'finish': 7,
      //   'end': 8
      // }

      if (!this.ethTokenSwap) {
        throw new Error('CASH2ETHTOKEN: "ethTokenSwap" of type object required')
      }
      if (!this.cashSwap) {
        throw new Error('CASH2ETHTOKEN: "cashSwap" of type object required')
      }

      this.state = {
        step: 0,

        secret: null,
        secretHash: null,

        isCashLocked: false,

        isEthContractFunded: false,
        isEthWithdrawn: false,

        ethSwapCreationTransactionHash: null,
        ethSwapWithdrawTransactionHash: null,

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
        // 1. Sign

        () => {
          flow.swap.room.once('swap sign', () => {
            flow.finishStep({
              isParticipantSigned: true,
            })
          })

          flow.swap.room.once('swap exists', () => {
            console.log(`swap already exists`)
          })

          // if I came late and he ALREADY send this, I request AGAIN
          flow.swap.room.sendMessage({
            event: 'request sign',
          })
        },

        // 2. Create secret, secret hash

        () => {
          // this.submitSecret()
        },

        // 3. Create cash lock, notify second party

        async () => {
          const { sellAmount } = flow.swap
          const { secretHash } = flow.state
          const amount = sellAmount

          await flow.cashSwap.create({
            secretHash,
            amount,
          })

          await flow.cashSwap.fund({
            secretHash,
          })

          flow.swap.room.sendMessage({
            event: 'lock cash',
            data: {
              secretHash,
            }
          })

          flow.finishStep()
        },

        // 4. manually set when cash is sent

        () => {
          // this.setCashLocked()
        },

        // 5. Wait participant creates ETH Contract

        () => {
          const { buyAmount, participant } = flow.swap

          flow.swap.room.once('create eth contract', ({ ethSwapCreationTransactionHash }) => {
            flow.setState({
              ethSwapCreationTransactionHash,
            })
          })

          const checkBalance = async () => {
            const balanceCheckResult = await flow.ethTokenSwap.checkBalance({
              ownerAddress: participant.eth.address,
              expectedValue: buyAmount,
            })

            if (balanceCheckResult) {
              console.error(`Waiting until deposit: ETH balance check error:`, balanceCheckResult)
              flow.swap.events.dispatch('eth balance check error', balanceCheckResult)
            } else {
              clearInterval(checkBalanceTimer)

              if (!flow.state.isEthContractFunded) {
                flow.finishStep({
                  isEthContractFunded: true,
                })
              }
            }
          }

          const checkBalanceTimer = setInterval(checkBalance, 5 * 1000)

          flow.swap.room.once('create eth contract', () => {
            checkBalance()
          })
        },

        // 6. Withdraw

        async () => {
          if (flow.state.isEthWithdrawn) {
            flow.finishStep()
          }

          const { participant } = flow.swap

          const data = {
            ownerAddress:   participant.eth.address,
            secret:         flow.state.secret,
          }

          try {
            await flow.ethTokenSwap.withdraw(data, (hash) => {
              flow.setState({
                ethSwapWithdrawTransactionHash: hash,
              })
            })
          } catch (err) {
            // TODO user can stuck here after page reload...
            if ( !/known transaction/.test(err.message) ) console.error(err)
            return
          }

          flow.swap.room.sendMessage({
            event: 'finish eth withdraw',
          })

          flow.finishStep({
            isEthWithdrawn: true,
          })
        },

        // 7. Finish

        () => {
          flow.swap.room.once('swap finished', () => {
            flow.finishStep({
              isFinished: true,
            })
          })
        },

        // 8. Finished!
        () => {

        }

      ]
    }

    submitSecret(secret) {
      if (this.state.secretHash) return true
      if (!this.state.isParticipantSigned)
        throw new Error(`Cannot proceed: participant not signed. step=${this.state.step}`)

      const secretHash = crypto.ripemd160(Buffer.from(secret, 'hex')).toString('hex')

      this.finishStep({
        secret,
        secretHash,
      })
    }

    async setCashLocked() {
      if (this.state.isCashLocked) return
      if (!this.state.secret)
        throw new Error(`Cash cannot be locked until secret is known`)

      this.finishStep({
        isCashLocked: true,
      })
    }

    syncBalance() {
      return false
    }

    async tryWithdraw(secret) {
      const { participant } = this.swap

      const data = {
        ownerAddress:   participant.eth.address,
        secret:         secret,
      }

      await this.ethTokenSwap.withdraw(data, (hash) => {
        this.setState({
          ethSwapWithdrawTransactionHash: hash,
        })
      })
    }

    async tryRefund() {

    }
  }

  return CASH2ETHTOKEN
}
