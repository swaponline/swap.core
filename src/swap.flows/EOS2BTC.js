import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const handlers = (flow) => {
  return {
    openSwap: () => {
      const { secretHash } = flow.state
      const { sellAmount: amount, participant } = flow.swap

      return flow.eosSwap.open({
        btcOwner: participant.eos.address,
        secretHash,
        amount
      })
    },
    btcWithdraw: () => {
      const { secret, scriptValues } = flow.state

      const tryWithdraw = () => flow.btcSwap.withdraw({ scriptValues, secret }, null, null, 'sha256')

      return tryWithdraw()
        .catch((error) => {
          console.log('Cannot withdraw BTC, try again in 5 sec...')
          return sleep(5000).then(tryWithdraw)
        })
    },
    refund: () => {
      const { participant: btcOwner } = this.swap

      return flow.eosSwap.refund({
        btcOwner
      })
    }
  }
}

const listeners = (flow) => {
  return {
    btcScript: () => {
      return new Promise(resolve => {
        flow.swap.room.once(flow.actions.createBtcScript, resolve)
        flow.swap.room.sendMessage({
          event: `request ${flow.actions.createBtcScript}`
        })
      })
    },
    verifyScript: () => {
      return new Promise(async (resolve, reject) => {
        const { buyAmount } = flow.swap

        const getLockTime = () => {
          const eosLockTime = flow.eosSwap.getLockPeriod()
          const btcLockTime = eosLockTime * 2
          const nowTime = Math.floor(Date.now() / 1000)

          return nowTime + btcLockTime
        }

        const scriptCheckResult = await flow.btcSwap.checkScript(flow.state.scriptValues, {
          value: buyAmount,
          recipientPublicKey: SwapApp.services.auth.accounts.btc.getPublicKey(),
          lockTime: getLockTime()
        })

        if (scriptCheckResult) {
          console.log('Cannot verify btc script', scriptCheckResult)
          reject(scriptCheckResult)
        } else {
          resolve()
        }
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
        swap.room.once(flow.actions.eosWithdraw, resolve)
      })
    }
  }
}

const notifiers = (flow) => {
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

    this.actions = {
      submitSecret: 'submit secret',
      createBtcScript: 'create btc script',
      verifyScript: 'verify script',
      openSwap: 'open swap',
      eosWithdraw: 'eos withdraw',
      btcWithdraw: 'btc withdraw',
    }

    this.act = handlers(this)
    this.needs = listeners(this)
    this.notify = notifiers(this)

    this.listenNotifyRequests()

    super._persistSteps()
    super._persistState()
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
        flow.act.openSwap().then(({ openTx, swapID }) => {
          flow.finishStep({ openTx, swapID })
          flow.notify.openSwap()
        })
      },
      () => {
        flow.needs.revealedSecret().then(secret => {
          flow.finishStep({ secret })
        })
        flow.needs.eosWithdrawTx().then(eosWithdrawTx => {
          flow.setState({ eosWithdrawTx })
        })
      },
      () => {
        flow.act.btcWithdraw().then(({ txid }) => {
          flow.finishStep({ btcWithdrawTx: txid })
          flow.notify.btcWithdraw()
        })
      }
    ]
  }

  listenNotifyRequests() {
    const flow = this

    flow.swap.room.on(`request ${flow.actions.openSwap}`, () => {
      if (flow.state.openTx && flow.state.swapID) {
        flow.notify.openSwap()
      }
    })

    flow.swap.room.on(`request ${flow.actions.btcWithdraw}`, () => {
      if (flow.state.btcWithdrawTx) {
        flow.notify.btcWithdraw()
      }
    })
  }

  tryRefund() {
    const flow = this

    return flow.act.refund().then((eosRefundTx) => {
      flow.setState({ eosRefundTx })
    })
  }
}

export default EOS2BTC
