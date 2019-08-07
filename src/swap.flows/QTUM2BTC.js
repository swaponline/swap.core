import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'


class QTUM2BTC extends Flow {

  static getName() {
    return `${constants.COINS.qtum}2${constants.COINS.btc}`
  }

  constructor(swap) {
    super(swap)

    this._flowName = QTUM2BTC.getName()

    this.qtumSwap = swap.participantSwap
    this.btcSwap = swap.ownerSwap

    if (!this.qtumSwap) {
      throw new Error('QTUM2BTC: "qtumSwap" of type object required')
    }
    if (!this.btcSwap) {
      throw new Error('QTUM2BTC: "btcSwap" of type object required')
    }

    this.state = {
      step: 0,

      isSignFetching: false,
      isMeSigned: false,

      secretHash: null,
      btcScriptValues: null,

      btcScriptVerified: false,

      isBalanceFetching: false,
      isBalanceEnough: false,
      balance: null,

      qtumSwapCreationTransactionHash: null,
      isEthContractFunded: false,

      secret: null,

      isQtumWithdrawn: false,
      isBtcWithdrawn: false,

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

      // 1. Sign swap to start

      () => {
        // this.sign()
      },

      // 2. Wait participant create, fund BTC Script

      () => {
        flow.swap.room.on('create btc script', ({ scriptValues, btcScriptCreatingTransactionHash }) => {
          const { step } = flow.state

          if (step >= 3) {
            return
          }

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
        this.verifyBtcScript()
      },

      // 4. Check balance

      () => {
        this.syncBalance()
      },

      // 5. Create ETH Contract

      async () => {
        const { participant, buyAmount, sellAmount } = flow.swap

        // TODO move this somewhere!
        const utcNow = () => Math.floor(Date.now() / 1000)
        const getLockTime = () => utcNow() + 3600 * 1 // 1 hour from now

        const scriptCheckResult = await flow.btcSwap.checkScript(flow.state.btcScriptValues, {
          value: buyAmount,
          recipientPublicKey: this.app.services.auth.accounts.btc.getPublicKey(),
          lockTime: getLockTime(),
        })

        if (scriptCheckResult) {
          console.error(`Btc script check error:`, scriptCheckResult)
          flow.swap.events.dispatch('btc script check error', scriptCheckResult)
          return
        }

        const swapData = {
          amount: sellAmount,
          secretHash: flow.state.secretHash,
          address: participant.qtum.address,
        }

        await this.qtumSwap.createSwap(swapData, (hash) => {
          flow.setState({
            qtumSwapCreationTransactionHash: hash,
          })
        })

        flow.swap.room.sendMessage('create qtum contract')
        flow.finishStep({
          isEthContractFunded: true,
        })
      },

      // 6. Wait participant withdraw

      () => {
        const { participant, owner } = flow.swap
        let timer

        flow.swap.room.on('finish qtum withdraw', ({ secret })  => {
          if (!flow.state.isQtumWithdrawn) {
            clearTimeout(timer)
            timer = null

            flow.finishStep({
              isQtumWithdrawn: true,
              secret
            })
          }
        })

        const checkSecretExist = () => {
          timer = setTimeout(async () => {
            let secret

            try {
              secret = await flow.qtumSwap.getSecret({
                participantAddress: participant.qtum.address,
                ownerAddress: owner.qtum.address,
              })
            }
            catch (err) {}

            if (secret) {
              if (!flow.state.isQtumWithdrawn) { // redundant condition but who cares :D
                flow.finishStep({
                  isQtumWithdrawn: true,
                  secret,
                })
              }
            }
            else {
              checkSecretExist()
            }
          }, 20 * 1000)
        }

        checkSecretExist()
      },

      // 7. Withdraw

      async () => {
        let { secret, btcScriptValues } = flow.state

        if (!btcScriptValues) {
          console.error('There is no "btcScriptValues" in state. No way to continue swap...')
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

      },
    ]
  }

  async sign() {
    this.setState({
      isSignFetching: true,
    })

    this.swap.room.sendMessage('swap sign')
    this.swap.room.sendMessage({
      event: 'swap sign',
    })
    this.finishStep({
      isMeSigned: true,
    })
  }

  verifyBtcScript() {
    this.finishStep({
      btcScriptVerified: true,
    })
  }


  async syncBalance() {
    const { sellAmount } = this.swap

    this.setState({
      isBalanceFetching: true,
    })

    const balance = await this.qtumSwap.getBalance()
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
}




export default QTUM2BTC
