import crypto from 'bitcoinjs-lib/src/crypto'
import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'

const actions = (flow) => {
  return {
    createBtcScript: () => {
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

      const fundScript = async () => {
        await flow.btcSwap.fundScript({
          scriptValues, amount
        }, (hash) => {
          createTx = hash
        }, 'sha256')

        return createTx
      }

      return fundScript().then((createTx) => {
        return { createTx, scriptValues }
      })
    },

    eosWithdraw: () => {
      const { secret } = flow.state
      const { participant: eosOwner } = flow.swap

      return flow.eosSwap.withdraw({
        eosOwner: eosOwner.eos.address,
        secret
      })
    },

    refund: () => {
      return this.btcSwap.refund({
        scriptValues: flow.state.btcScriptValues,
        secret: flow.state.secret,
      })
    }
  }
}

const listeners = (flow) => {
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

const notifications = (flow) => {
  return {
    createBtcScript: () => {
      const {scriptValues, createTx} = flow.state

      flow.swap.room.sendMessage({
        event: flow.steps.createBtcScript,
        data: {
          scriptValues, createTx
        }
      })
    },
    eosWithdraw: () => {
      const {eosWithdrawTx, secret} = flow.state

      flow.swap.room.sendMessage({
        event: flow.steps.eosWithdraw,
        data: {
          eosWithdrawTx, secret
        }
      })
    }
  }
}

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

    this.act = actions(this)
    this.needs = listeners(this)
    this.notify = notifications(this)

    this.listenNotifyRequests()

    super._persistSteps()
    super._persistState()
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
        flow.act.createBtcScript().then(({ scriptValues, createTx }) => {
          flow.finishStep({ scriptValues, createTx })
          flow.notify.createBtcScript()
        })
      },
      () => {
        flow.needs.openSwap().then(({ openTx, swapID }) => {
          flow.finishStep({ openTx, swapID })
        })
      },
      () => {
        flow.act.eosWithdraw().then(eosWithdrawTx => {
          flow.finishStep({ eosWithdrawTx })
          flow.notify.eosWithdraw()
        })
      },
      () => {
        flow.needs.btcWithdraw().then(({ btcWithdrawTx }) => {
          flow.finishStep({ btcWithdrawTx })
        })
      }
    ]
  }

  tryRefund() {
    const flow = this

    return flow.act.refund().then((hash) => {
      flow.setState({
        refundTransactionHash: hash,
        isRefunded: true
      })
    })
  }

  listenNotifyRequests() {
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
}

export default BTC2EOS
