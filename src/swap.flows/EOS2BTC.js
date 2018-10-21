import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

class EOS2BTC extends Flow {
  static getName() {
    return `${this.getFromName()}2${this.getToName()}`
  }
  static getFromName() {
    return constants.COINS.eos
  }
  static getToName() {
    return constants.COINS.btc
  }
  constructor(swap) {
    super(swap)

    this._flowName = EOS2BTC.getName()

    this.eosSwap = SwapApp.swaps[constants.COINS.eos]
    this.btcSwap = SwapApp.swaps[constants.COINS.btc]

    this.state = {
      ...this.state,
      ...{
        swapID: null,

        secret: null,
        secretHash: null,

        scriptValues: null,

        createTx: null,
        openTx: null,
        eosWithdrawTx: null,
        btcWithdrawTx: null
      }
    }

    this.steps = {
      submitSecret: 'submit secret',
      createBtcScript: 'create btc script',
      verifyScript: 'verify script',
      openSwap: 'open swap',
      eosWithdraw: 'eos withdraw',
      btcWithdraw: 'btc withdraw',
    }

    this.listenRequests()

    super._persistSteps()
    super._persistState()
  }

  _getSteps() {
    const flow = this

    return [
      () => {
        flow.needs().btcScript().then(({ scriptValues, createTx }) => {
          const { secretHash } = scriptValues

          flow.finishStep({ scriptValues, secretHash, createTx })
        })
      },
      () => {
        flow.needs().verifyScript().then(() => {
          // todo: verify transaction and check scriptValues

          flow.finishStep()
        })
      },
      () => {
        const { secretHash } = flow.state
        const { sellAmount: amount, participant } = flow.swap

        flow.eosSwap.open({
          btcOwner: participant.eos.address,
          secretHash,
          amount
        }, ({ openTx, swapID }) => {
          flow.finishStep({ openTx, swapID })
          flow.send().openSwap()
        })
      },
      () => {
        flow.needs().revealedSecret().then(secret => {
          flow.finishStep({ secret })
        })
        flow.needs().eosWithdrawTx().then(eosWithdrawTx => {
          flow.setState({ eosWithdrawTx })
        })
      },
      () => {
        const { secret, scriptValues } = flow.state

        // withdraw fails until funding transaction will get confirmed
        const withdraw = () => {
          return flow.btcSwap.withdraw({ scriptValues, secret }, null, null, 'sha256')
            .catch((error) => {
              console.log('Cannot withdraw BTC, try again in 5 sec...')
              return sleep(5000).then(withdraw)
            })
        }

        withdraw().then(({ txid }) => {
          flow.finishStep({ btcWithdrawTx: txid })
          flow.send().btcWithdraw()
        })
      }
    ]
  }

  tryRefund() {
    const { participant: btcOwner } = this.swap

    return this.eosSwap.refund({
      btcOwner
    }, (eosRefundTx) => {
      this.setState({ eosRefundTx })
    })
  }

  listenRequests() {
    const flow = this

    flow.swap.room.on(`request ${flow.steps.openSwap}`, () => {
      if (flow.state.openTx && flow.state.swapID) {
        flow.send().openSwap()
      }
    })

    flow.swap.room.on(`request ${flow.steps.btcWithdraw}`, () => {
      if (flow.state.btcWithdrawTx) {
        flow.send().btcWithdraw()
      }
    })
  }

  needs() {
    const flow = this

    return {
      btcScript: () => {
        return new Promise(resolve => {
          flow.swap.room.once(flow.steps.createBtcScript, resolve)
          flow.swap.room.sendMessage({
            event: `request ${flow.steps.createBtcScript}`
          })
        })
      },
      verifyScript: () => {
        return new Promise(resolve => {
          flow.swap.events.once(flow.steps.verifyScript, resolve)
        })
      },
      revealedSecret: () => {
        return new Promise(resolve => {
          const { owner: eosOwnerData, participant: btcOwnerData } = flow.swap
          const eosOwner = eosOwnerData.eos.address
          const btcOwner = btcOwnerData.btc.address

          const fetchSecret = async () => {
            const swap = await this.eosSwap.findCurrentSwap({ eosOwner, btcOwner })
            const { secret } = swap

            return secret
          }

          return fetchSecret().then((secret) => {
            if (secret == 0) {
              console.log('Cannot fetch secret, try again in 5 sec...')
              return sleep(5000).then(fetchSecret)
            } else {
              return secret
            }
          })
        })
      },
      eosWithdrawTx: () => {
        return new Promise(resolve => {
          swap.room.once(flow.steps.eosWithdraw, resolve)
        })
      }
    }
  }

  send() {
    const flow = this

    return {
      openSwap() {
        const { openTx, swapID } = flow.state

        flow.swap.room.sendMessage({
          event: 'open swap',
          data: {
            openTx, swapID
          }
        })
      },
      btcWithdraw() {
        const { btcWithdrawTx } = flow.state

        flow.swap.room.sendMessage({
          event: 'btc withdraw',
          data: {
            btcWithdrawTx
          }
        })
      }
    }
  }
}

export default EOS2BTC
