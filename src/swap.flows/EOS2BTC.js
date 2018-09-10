import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'

class EOS2BTC extends Flow {
  static getName() {
    return `${constants.COINS.eos}2${constants.COINS.btc}`
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

    this.listenRequests = {}

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
        const { secretHash } = flow.state
        const { sellAmount: amount, participant } = flow.swap

        flow.eosSwap.open({
          participantAccount: participant.eos.address,
          secretHash,
          amount
        }, ({ openTx, swapID }) => {
          flow.finishStep({ openTx, swapID })
          flow.send().openSwap()
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
          this.finishStep({ btcWithdrawTx })
          flow.send().btcWithdraw()
        })
      }
    ]
  }

  needs() {
    const flow = this
    const swap = this.swap
    return {
      btcScript: () => {
        flow.updateListenRequests()
        return new Promise(resolve => {
          swap.room.once('create btc script', resolve)
          swap.room.sendMessage({
            event: 'request create btc script'
          })
        })
      },
      verifyScript: () => {
        flow.updateListenRequests()
        return new Promise(resolve => {
          swap.events.once('verify script', resolve)
        })
      },
      eosWithdraw: () => {
        flow.updateListenRequests()
        return new Promise(resolve => {
          swap.room.once('eos withdraw', resolve)
          swap.room.sendMessage({
            event: 'request eos withdraw'
          })
        })
      }
    }
  }

  updateListenRequests() {
    const flow = this
    const state = this.state
    const swap = this.swap

    if (!flow.listenRequests['request open swap']) {
      if (state.openTx && state.swapID) {
        swap.room.on('request open swap', () => {
          flow.send().openSwap()
        })

        flow.listenRequests['request open swap'] = true
      }
    }

    if (!flow.listenRequests['request btc withdraw']) {
      if (state.btcWithdrawTx) {
        swap.room.on('request btc withdraw', () => {
          flow.send().btcWithdraw()
        })

        flow.listenRequests['request btc withdraw'] = true
      }
    }
  }

  send() {
    const state = this.state
    const swap = this.swap
    return {
      openSwap() {
        const { openTx, swapID } = state

        swap.room.sendMessage({
          event: 'open swap',
          data: {
            openTx, swapID
          }
        })
      },
      btcWithdraw() {
        const { btcWithdrawTx } = state

        swap.room.sendMessage({
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
