import crypto from 'bitcoinjs-lib/src/crypto'
import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'

class BTC2EOS extends Flow {
  constructor(swap) {
    super(swap)

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
          flow.swap.room.sendMessage({
            event: 'create btc script',
            data: {
              scriptValues, createTx
            }
          })

          flow.finishStep({
            scriptValues, createTx
          })
        })
      },
      () => {
        flow.needs().openSwap().then(({ openTx, swapID }) => {
          flow.finishStep({ openTx, swapID })
        })
      },
      () => {
        const { buyAmount, sellAmount } = flow.swap
        const { swapID, secret } = flow.state

        flow.eosSwap.withdraw({
          swapID,
          secret
        }).then((eosWithdrawTx) => {
          flow.swap.room.sendMessage({
            event: 'eos withdraw',
            data: {
              eosWithdrawTx, secret
            }
          })

          flow.finishStep({ eosWithdrawTx, secret })
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
    const swap = this.swap
    return {
      secret: () => {
        return new Promise(resolve => {
            swap.events.once('submit secret', resolve)
            swap.events.dispatch('request submit secret')
        })
      },
      openSwap: () => {
        return new Promise(resolve => {
          swap.room.once('open swap', resolve)
          swap.room.sendMessage({
            event: 'request open swap'
          })
        })
      },
      btcWithdraw: () => {
        return new Promise(resolve => {
          swap.room.once('btc withdraw', resolve)
          swap.room.sendMessage({
            event: 'request btc withdraw'
          })
        })
      }
    }
  }
}

export default BTC2EOS