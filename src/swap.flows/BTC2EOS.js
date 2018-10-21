import crypto from 'bitcoinjs-lib/src/crypto'
import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'

class BTC2EOS extends Flow {
  static getName() {
    return `${this.getFromName()}2${this.getToName()}`
  }
  static getFromName() {
    return constants.COINS.btc
  }
  static getToName() {
    return constants.COINS.eos
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
        flow.needs().secret().then(({ secret, secretHash }) => {
          this.finishStep({
            secret, secretHash
          })
        })
      },
      () => {
        const { sellAmount: amount, participant: eosOwner } = flow.swap

        const getLockTime = () => {
          const eosLockTime = flow.eosSwap.getLockPeriod()
          const btcLockTime = eosLockTime * 2
          const nowTime = Math.floor(Date.now() / 1000)

          return nowTime + btcLockTime
        }

        const lockTime = getLockTime()

        const scriptValues = {
          secretHash: flow.state.secretHash,
          ownerPublicKey: SwapApp.services.auth.accounts.btc.getPublicKey(),
          recipientPublicKey: eosOwner.btc.publicKey,
          lockTime: lockTime
        }

        flow.btcSwap.fundScript({
          scriptValues,
          amount
        }, (createTx) => {
          flow.finishStep({ scriptValues, createTx })
          flow.send().btcScript()
        }, 'sha256')
      },
      () => {
        flow.needs().openSwap().then(({ openTx, swapID }) => {
          flow.finishStep({ openTx, swapID })
        })
      },
      () => {
        const { secret } = flow.state
        const { participant: eosOwner } = flow.swap

        flow.eosSwap.withdraw({
          eosOwner: eosOwner.eos.address,
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

  tryRefund() {
    return this.btcSwap.refund({
      scriptValues: this.state.btcScriptValues,
      secret: this.state.secret,
    }, (hash) => {
      this.setState({
        refundTransactionHash: hash,
        isRefunded: true,
      })
    })
  }

  listenRequests() {
    const flow = this

    flow.swap.room.on(`request ${flow.steps.createBtcScript}`, () => {
      if (flow.state.scriptValues && flow.state.createTx) {
        flow.send().btcScript()
      }
    })

    flow.swap.room.on(`request ${flow.steps.eosWithdraw}`, () => {
      if (flow.state.eosWithdrawTx && flow.state.secret) {
        flow.send().eosWithdraw()
      }
    })
  }

  needs() {
    const flow = this

    return {
      secret: () => {
        return new Promise(resolve => {
            flow.swap.events.once(flow.steps.submitSecret, resolve)
        })
      },
      openSwap: () => {
        return new Promise(resolve => {
          flow.swap.room.once(flow.steps.openSwap, resolve)
          flow.swap.room.sendMessage({
            event: `request ${flow.steps.openSwap}`
          })
        })
      },
      btcWithdraw: () => {
        return new Promise(resolve => {
          flow.swap.room.once(flow.steps.btcWithdraw, resolve)
          flow.swap.room.sendMessage({
            event: `request ${flow.steps.btcWithdraw}`
          })
        })
      }
    }
  }

  send() {
    const flow = this

    return {
      btcScript: () => {
        const { scriptValues, createTx } = flow.state

        flow.swap.room.sendMessage({
          event: flow.steps.createBtcScript,
          data: {
            scriptValues, createTx
          }
        })
      },
      eosWithdraw: () => {
        const { eosWithdrawTx, secret } = flow.state

        flow.swap.room.sendMessage({
          event: flow.steps.eosWithdraw,
          data: {
            eosWithdrawTx, secret
          }
        })
      }
    }
  }
}

export default BTC2EOS
