import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'

class EOS2BTC extends Flow {
  constructor(swap) {
    super(swap)

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
          flow.finishStep()
        })
      },
      () => {
        const { participant, sellAmount } = flow.swap
        const { secretHash } = flow.state

        flow.eosSwap.open({
          participantAccount: participant.eos.address,
          amount: sellAmount,
          secretHash
        }).then(({ openTx, swapID }) => {
          flow.finishStep({
            openTx, swapID
          })

          flow.swap.room.sendMessage({
            event: 'open swap',
            data: {
              openTx, swapID
            }
          })
        })
      },
      () => {
        flow.needs().eosWithdraw().then(({ secret, eosWithdrawTx }) => {
          flow.finishStep({ secret, eosWithdrawTx })
        })
      },
      () => {
        const { secret, scriptValues } = flow.state

        flow.btcSwap.withdraw({ scriptValues, secret }, (btcWithdrawTx) => {
          this.finishStep({
            btcWithdrawTx
          })

          flow.swap.room.sendMessage({
            event: 'btc withdraw',
            data: {
              btcWithdrawTx
            }
          })
        })
      }
    ]
  }

  needs() {
    const swap = this.swap
    return {
      btcScript: () => {
        return new Promise(resolve => {
          swap.room.once('create btc script', resolve)
          swap.events.dispatch('request create btc script')
        })
      },
      verifyScript: () => {
        return new Promise(resolve => {
          swap.events.once('verify script', resolve)
          swap.events.dispatch('request verify script')
        })
      },
      eosWithdraw: () => {
        return new Promise(resolve => {
          swap.room.once('eos withdraw', resolve)
          swap.events.dispatch('request eos withdraw')
        })
      }
    }
  }
}

export default EOS2BTC