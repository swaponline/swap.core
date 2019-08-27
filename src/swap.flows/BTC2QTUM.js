import crypto from 'bitcoinjs-lib/src/crypto'
import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'


class BTC2QTUM extends Flow {

  static getName() {
    return `${constants.COINS.btc}2${constants.COINS.qtum}`
  }

  static getFromName() {
    return constants.COINS.btc
  }
  static getToName() {
    return constants.COINS.qtum
  }

  constructor(swap) {
    super(swap)

    this._flowName = BTC2QTUM.getName()

    this.qtumSwap = this.app.swaps[constants.COINS.qtum]
    this.btcSwap = this.app.swaps[constants.COINS.btc]

    this.stepNumbers = {
      'sign': 1,
      'submit-secret': 2,
      'sync-balance': 3,
      'lock-btc': 4,
      'wait-lock-qtum': 5,
      'withdraw-qtum': 6,
      'finish': 7,
      'end': 8
    }


    // TODO DELETE THIS SHIT
    this.myBtcAddress = this.app.services.auth.accounts.btc.getAddress()

    if (!this.qtumSwap) {
      throw new Error('BTC2QTUM: "qtumSwap" of type object required')
    }
    if (!this.btcSwap) {
      throw new Error('BTC2QTUM: "btcSwap" of type object required')
    }

    this.state = {
      step: 0,

      isSignFetching: false,
      isParticipantSigned: false,

      btcScriptCreatingTransactionHash: null,
      secretHash: null,
      btcScriptValues: null,

      btcScriptVerified: false,

      isBalanceFetching: false,
      isBalanceEnough: false,
      balance: null,

      isQtumContractFunded: false,

      qtumSwapWithdrawTransactionHash: null,
      isQtumWithdrawn: false,

      refundTransactionHash: null,
      isRefunded: false,
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

      // 1. Signs

      () => {
        flow.swap.room.once('swap sign', () => {
          flow.finishStep({
            isParticipantSigned: true,
          }, { step: 'sign'})

        })
      },

      // 2. Create secret, secret hash

      () => {
        // this.submitSecret()
      },

      // 3. Check balance

      () => {
        this.syncBalance()
      },

      // 4. Create BTC Script, fund, notify participant

      async () => {
        const { sellAmount, participant } = flow.swap

        // TODO move this somewhere!
        const utcNow = () => Math.floor(Date.now() / 1000)
        const getLockTime = () => utcNow() + 3600 * 3 // 3 hours from now

        const scriptValues = {
          lockTime: getLockTime(),
          secretHash: flow.state.secretHash,
          recipientPublicKey: participant.btc.publicKey,
          ownerPublicKey: this.app.services.auth.accounts.btc.getPublicKey(),
        }

        await flow.btcSwap.fundScript({
          scriptValues,
          amount: sellAmount,
        }, (hash) => {
          flow.setState({
            btcScriptCreatingTransactionHash: hash,
          })
        })

        flow.swap.room.sendMessage({
          event: 'create btc script',
          data: { btcScriptValues: scriptValues }
        })

        flow.finishStep({
          isBtcScriptFunded: true,
          btcScriptValues: scriptValues,
        }, {step: 'lock-btc'})
      },

      // 5. Wait participant creates ETH Contract

      () => {
        const { participant, owner } = flow.swap
        let timer

        const checkQtumBalance = () => {
          timer = setTimeout(async () => {
            const balance = await flow.qtumSwap.getSwapBalance({
              ownerAddress: participant.qtum.address,
              participantAddress: owner.qtum.address
            })

            if (balance > 0) {
              if (!flow.state.isQtumContractFunded) { // redundant condition but who cares :D
                flow.finishStep({
                  isQtumContractFunded: true,
                }, { step: 'wait-lock-qtum'})
              }
            }
            else {
              checkQtumBalance()
            }
          }, 20 * 1000)
        }

        checkQtumBalance()

        flow.swap.room.once('create qtum contract', () => {
          if (!flow.state.isQtumContractFunded) {
            clearTimeout(timer)
            timer = null

            flow.finishStep({
              isEthContractFunded: true,
            }, { step: 'wait-lock-qtum' })
          }
        })
      },

      // 6. Withdraw

      async () => {
        const { buyAmount, participant, owner } = flow.swap

        const data = {
          ownerAddress: participant.qtum.address,
          participantAddress: owner.qtum.address,
          secret: flow.state.secret,
        }
        console.log('Withdraw data', data)

        const balanceCheckResult = await flow.qtumSwap.checkBalance({
          ownerAddress: participant.qtum.address,
          participantAddress: owner.qtum.address,
          expectedValue: buyAmount,
        })

        console.log('finish check balance')

        if (balanceCheckResult) {
          console.error(`Qtum balance check error:`, balanceCheckResult)
          flow.swap.events.dispatch('qtum balance check error', balanceCheckResult)
          return
        }

        console.log('Withdraw start')

        await flow.qtumSwap.withdraw(data, (hash) => {
          flow.setState({
            ethSwapWithdrawTransactionHash: hash,
          })
        })

        flow.swap.room.sendMessage({
          event: 'finish qtum withdraw',
          data: { secret: flow.state.secret }
        })

        flow.finishStep({
          isQtumWithdrawn: true,
        }, { step: 'withdraw-qtum' })
      },

      // 7. Finish

      () => {

      },
    ]
  }

  submitSecret(secret) {
    const secretHash = crypto.ripemd160(Buffer.from(secret, 'hex')).toString('hex')

    this.finishStep({
      secret,
      secretHash,
    }, { step: 'submit-secret' })
  }

  async syncBalance() {
    const { sellAmount } = this.swap

    this.setState({
      isBalanceFetching: true,
    })

    console.log("this.myBtcAddress", this.myBtcAddress)
    const balance = await this.btcSwap.fetchBalance(this.myBtcAddress)
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

  async isRefundSuccess() {
    const { refundTransactionHash, isRefunded } = this.state
    if (refundTransactionHash && isRefunded) {
      if (await this.btcSwap.checkTX(refundTransactionHash)) {
        return true
      } else {
        console.warn('BTC2QTUM - unknown refund transaction')
        this.setState( {
          refundTransactionHash: null,
          isRefunded: false,
        } )
        return false
      }
    }
    return false
  }

  tryRefund() {
    this.btcSwap.refund({
      scriptValues: this.state.btcScriptValues,
      secret: this.state.secret,
    }, (hash) => {
      this.setState({
        refundTransactionHash: hash,
      })
    })
    .then(() => {
      this.setState({
        isRefunded: true,
      })
    })
  }
}


export default BTC2QTUM
