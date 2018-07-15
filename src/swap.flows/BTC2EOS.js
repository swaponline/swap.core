import crypto from 'bitcoinjs-lib/src/crypto'
import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'

class BTC2EOS extends Flow {
  constructor(swap) {
    super(swap)

    this.btcSwap = SwapApp.swaps[constants.COINS.btc]
    this.eosSwap = SwapApp.swaps[constants.COINS.eos]

    super._persistsSteps()
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
        flow.needs.secret().then(({ secret, secretHash }) => {
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
          lockTime: getLockTime()
        }

        flow.btcSwap.fundScript({
          scriptValues,
          amount
        }, (createTx) => {
          flow.swap.room.sendMessage('create btc script', {
            scriptValues, createTx
          })

          flow.finishStep({
            scriptValues, createTx
          })
        })
      },
      () => {
        flow.needs.openSwap().then(({ openTx, swapID }) => {
          flow.finishStep({ openTx, swapID })
        })
      },
      () => {
        const { buyAmount, sellAmount } = flow.swap
        const { swapID, secret } = flow.state

        flow.eosSwap.withdraw({
          swapID,
          secret
        }, (eosWithdrawTx) => {
          flow.swap.room.sendMessage('eos withdraw', {
            eosWithdrawTx, secret
          })

          flow.finishStep({ eosWithdrawTx, secret })
        })
      },
      () => {
        flow.needs.btcWithdraw().then(({ btcWithdrawTx }) => {
          flow.finishStep({ btcWithdrawTx })
        })
      }
    ]
  }

  needs = {
    secret: () => {
      return new Promise(resolve =>
        this.swap.events.once('submit secret', resolve)
      )
    },
    openSwap: () => {
      return new Promise(resolve =>
        this.swap.room.once('open swap', resolve)
      )
    },
    btcWithdraw: () => {
      return new Promise(resolve =>
        this.swap.room.once('btc withdraw', resolve)
      )
    }
  }
}

export default BTC2EOS