import crypto from 'bitcoinjs-lib/src/crypto'
import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'

class BTC2EOS extends Flow {
  static getName() {
    return `${constants.COINS.btc}2${constants.COINS.eos}`
  }

  constructor(swap) {
    super(swap)

    this._flowName = BTC2EOS.getName()

    this.btcSwap = SwapApp.swaps[constants.COINS.btc]
    this.eosSwap = SwapApp.swaps[constants.COINS.eos]

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
        flow.needs().secret().then(({ secret, secretHash }) => {
          this.finishStep({
            secret, secretHash
          })
        })
      },
      () => {
        const { sellAmount: amount, participant } = flow.swap

        const scriptValues = {
          secretHash: flow.state.secretHash,
          ownerPublicKey: SwapApp.services.auth.accounts.btc.getPublicKey(),
          recipientPublicKey: participant.btc.publicKey,
          lockTime: flow.eosSwap.getLockTime()
        }

        flow.btcSwap.fundScript({
          scriptValues,
          amount
        }, (createTx) => {
          flow.finishStep({ scriptValues, createTx })
          flow.send().btcScript()
        })
      },
      () => {
        flow.needs().openSwap().then(({ openTx, swapID }) => {
          flow.finishStep({ openTx, swapID })
        })
      },
      () => {
        const { swapID, secret } = flow.state

        flow.eosSwap.withdraw({
          swapID,
          secret
        }, (eosWithdrawTx) => {
          flow.finishStep({ eosWithdrawTx })
          flow.send().eosWithdraw()
        })
      },
      () => {
        flow.needs().btcWithdraw().then(({ btcWithdrawTx }) => {
          flow.finishStep({ btcWithdrawTx })
        })
      }
    ]
  }

  needs() {
    const flow = this
    const swap = this.swap
    return {
      secret: () => {
        flow.updateListenRequests()
        return new Promise(resolve => {
            swap.events.once('submit secret', resolve)
        })
      },
      openSwap: () => {
        flow.updateListenRequests()
        return new Promise(resolve => {
          swap.room.once('open swap', resolve)
          swap.room.sendMessage({
            event: 'request open swap'
          })
        })
      },
      btcWithdraw: () => {
        flow.updateListenRequests()
        return new Promise(resolve => {
          swap.room.once('btc withdraw', resolve)
          swap.room.sendMessage({
            event: 'request btc withdraw'
          })
        })
      }
    }
  }

  updateListenRequests() {
    const flow = this
    const state = this.state
    const swap = this.swap

    if (!flow.listenRequests['request create btc script']) {
      if (state.scriptValues && state.createTx) {
        swap.room.on('request create btc script', () => {
          console.log('SEND BTC SCRIPT')

          flow.send().btcScript()
        })

        flow.listenRequests['request create btc script'] = true
      }
    }

    if (!flow.listenRequests['request eos withdraw']) {
      if (state.eosWithdrawTx && state.secret) {
        swap.room.on('request eos withdraw', () => {
          flow.send().eosWithdraw()
        })

        flow.listenRequests['request eos withdraw']
      }
    }

    console.log('listen requests', flow.listenRequests)
  }

  send() {
    const state = this.state
    const swap = this.swap
    return {
      btcScript: () => {
        const { scriptValues, createTx } = state

        swap.room.sendMessage({
          event: 'create btc script',
          data: {
            scriptValues, createTx
          }
        })
      },
      eosWithdraw: () => {
        const { eosWithdrawTx, secret } = state

         swap.room.sendMessage({
          event: 'eos withdraw',
          data: {
            eosWithdrawTx, secret
          }
        })
      }
    }
  }
}

export default BTC2EOS