import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'

class EOS2BTC extends Flow {
  constructor(swap) {
    super(swap)

    this.eosSwap = SwapApp.swaps[constants.COINS.eos]
    this.btcSwap = SwapApp.swaps[constants.COINS.btc]

    super._persistSteps()
    super._persistState()

    this.state = {
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

  _getSteps() {
    const flow = this

    return [
      () => {
        flow.needs.btcScript().then(({ scriptValues, createTx }) => {
          const { secretHash } = scriptValues

          flow.finishStep({ scriptValues, secretHash, createTx })
        })
      },
      () => {
        flow.needs.verifyScript().then(() => {
          flow.finishStep()
        })
      },
      () => {
        const { participant: participantAccount, sellAmount: amount } = flow.swap

        flow.eosSwap.open({ participantAccount, secretHash, amount }).then((openTx) => {
          const swapID = null

          flow.finishStep({
            openTx, swapID
          })

          flow.swap.room.sendMessage('open swap', {
            openTx, swapID
          })
        })
      },
      () => {
        flow.needs.eosWithdraw().then(({ secret, eosWithdrawTx }) => {
          flow.finishStep({ secret, eosWithdrawTx })
        })
      },
      () => {
        flow.btcSwap.withdraw({ scriptValues, secret }, (btcWithdrawTx) => {
          this.finishStep({
            btcWithdrawTx
          })

          flow.swap.room.sendMessage('btc withdraw', {
            btcWithdrawTx
          })
        })
      }
    ]
  }

  needs = {
    btcScript: () => {
      return new Promise(resolve =>
        this.swap.room.once('create btc script', resolve)
      )
    },
    verifyScript: () => {
      return new Promise(resolve =>
        this.swap.events.once('verify script', resolve)
      )
    },
    eosWithdraw: () => {
      return new Promise(resolve =>
        this.swap.room.once('eos withdraw', resolve)
      )
    }
  }
}