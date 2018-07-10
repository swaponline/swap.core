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

    if (!this.ethSwap) {
      throw new Error('BTC2ETH: "ethSwap" of type object required')
    }
    if (!this.btcSwap) {
      throw new Error('BTC2ETH: "btcSwap" of type object required')
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

      ethSwapCreationTransactionHash: null,
      isEthContractFunded: false,

      secret: null,
      isEthClosed: false,

      isEthWithdrawn: false,
      isBtcWithdrawn: false,

      refundTransactionHash: null,
      isRefunded: false,
    }

    super._persistSteps()
    this._persistState()
  }

  _persistState() {
    super._persistState()

    // console.log('START GETTING SECRET')
    //
    // this.ethSwap.getSecret({
    //   participantAddress: this.swap.participant.eth.address,
    // })
    //   .then((res) => {
    //     console.log('SECRET', res)
    //   })
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
        flow.swap.room.once('create btc script', ({ scriptValues }) => {
          flow.finishStep({
            secretHash: scriptValues.secretHash,
            btcScriptValues: scriptValues,
          })
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

        await this.ethSwap.create(swapData, (hash) => {
          flow.setState({
            ethSwapCreationTransactionHash: hash,
          })
        })

        flow.swap.room.sendMessage('create eth contract')

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
                })
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
            })
          }
        })
      },

      // 7. Withdraw

      async () => {
        const { participant } = flow.swap
        let { secret, isEthClosed, btcScriptValues } = flow.state

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
            console.error(err)
            return
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

        if (!isEthClosed) {
          try {
            // TODO BE CAREFUL WITH CLOSE()!
            // TODO if call .close() before secret received then ETH participant will lost it and never withdraw from BTC script...
            await flow.ethSwap.close({
              participantAddress: participant.eth.address,
            })

            flow.setState({
              isEthClosed: true,
            })
          }
          catch (err) {
            // TODO notify user that smth goes wrong
            console.error(err)
            return
          }
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
    const { participant } = this.swap

    this.setState({
      isSignFetching: true,
    })

    await this.ethSwap.sign(
      {
        participantAddress: participant.eth.address,
      },
      (signTransactionHash) => {
        this.setState({
          signTransactionHash,
        })
      }
    )

    this.swap.room.sendMessage('swap sign')

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

    const balance = await this.ethSwap.fetchBalance(SwapApp.services.auth.accounts.eth.address)
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
      })
  }
}


export default ETH2BTC
