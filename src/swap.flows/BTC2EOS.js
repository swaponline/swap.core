import crypto from 'bitcoinjs-lib/src/crypto'
import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'


const transactionHandlers = (flow) => ({
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
      ownerPublicKey: this.app.services.auth.accounts.btc.getPublicKey(),
      recipientPublicKey: eosOwner.btc.publicKey,
      lockTime: lockTime
    }

    return new Promise(async (resolve, reject) => {
      try {
        await flow.btcSwap.fundScript({
          scriptValues,
          amount,
        }, (createTx) => {
          resolve({ createTx, scriptValues })
        }, 'sha256')
      } catch (err) {
        console.error(`funding tx failed: ${err.message}`)
      }
    })
  },
  eosWithdraw: () => {
    const { secret } = flow.state
    const { participant: eosOwner } = flow.swap

    return flow.eosSwap.withdraw({
      eosOwner: eosOwner.eos.address,
      secret,
    })
  },
  refund: () => {
    const { secret, scriptValues } = flow.state

    return new Promise(async (resolve, reject) => {
      await flow.btcSwap.refund({
          scriptValues,
          secret,
        }, 'sha256')
          .then((btcRefundTx) => {
            resolve(btcRefundTx)
          })
          .catch((error) => {
            console.error(`refund failed: ${error.message}`)
          })
        })
  },
})

const pullHandlers = (flow) => ({
  submitSecret: () => new Promise(resolve => {
    flow.swap.events.once(flow.actions.submitSecret, resolve)
  }),
  openSwap: () => new Promise(resolve => {
    flow.swap.room.once(flow.actions.openSwap, resolve)
    flow.swap.room.sendMessage({
      event: `request ${flow.actions.openSwap}`,
    })
  }),
  btcWithdraw: () => new Promise(resolve => {
    flow.swap.room.once(flow.actions.btcWithdraw, resolve)
    flow.swap.room.sendMessage({
      event: `request ${flow.actions.btcWithdraw}`,
    })
  }),
})

const pushHandlers = (flow) => ({
  createBtcScript: () => {
    const { scriptValues, createTx } = flow.state

    flow.swap.room.sendMessage({
      event: flow.actions.createBtcScript,
      data: {
        scriptValues, createTx,
      },
    })
  },
  eosWithdraw: () => {
    const { eosWithdrawTx, secret } = flow.state

    flow.swap.room.sendMessage({
      event: flow.actions.eosWithdraw,
      data: {
        eosWithdrawTx, secret,
      },
    })
  },
})

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

    this.btcSwap = this.app.swaps[constants.COINS.btc]
    this.eosSwap = this.app.swaps[constants.COINS.eos]

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
        btcWithdrawTx: null,

        eosRefundTx: null,
        btcRefundTx: null,
      },
    }

    this.actions = {
      submitSecret: 'submit secret',
      createBtcScript: 'create btc script',
      verifyScript: 'verify script',
      openSwap: 'open swap',
      eosWithdraw: 'eos withdraw',
      btcWithdraw: 'btc withdraw',
    }

    this.transact = transactionHandlers(this)
    this.pull = pullHandlers(this)
    this.push = pushHandlers(this)

    this.listenRequests()

    super._persistSteps()
    super._persistState()
  }

  _getSteps() {
    const flow = this

    return [
      () => {
        flow.pull.submitSecret().then(({ secret, secretHash }) => {
          this.finishStep({ secret, secretHash })
        })
      },
      () => {
        flow.transact.createBtcScript().then(({ scriptValues, createTx }) => {
          flow.finishStep({ scriptValues, createTx })
          flow.push.createBtcScript()
        })
      },
      () => {
        flow.pull.openSwap().then(({ openTx, swapID }) => {
          flow.finishStep({ openTx, swapID })
        })
      },
      () => {
        flow.transact.eosWithdraw().then((eosWithdrawTx) => {
          flow.finishStep({ eosWithdrawTx })
          flow.push.eosWithdraw()
        })
      },
      () => {
        flow.pull.btcWithdraw().then(({ btcWithdrawTx }) => {
          flow.finishStep({ btcWithdrawTx })
        })
      },
    ]
  }

  tryRefund() {
    const flow = this

    return flow.transact.refund().then((btcRefundTx) => {
      flow.setState({
        btcRefundTx,
        refundTransactionHash: btcRefundTx,
        isRefunded: true,
      })
    })
  }

  async isRefundSuccess() {
    const { refundTransactionHash, isRefunded } = this.state
    if (refundTransactionHash && isRefunded) {
      if (await this.btcSwap.checkTX(refundTransactionHash)) {
        return true
      } else {
        console.warn('BTC2EOS - unknown refund transaction')
        this.setState( {
          refundTransactionHash: null,
          isRefunded: false,
        } )
        return false
      }
    }
    return false
  }

  listenRequests() {
    const flow = this

    flow.swap.room.on(`request ${flow.actions.createBtcScript}`, () => {
      if (flow.state.scriptValues && flow.state.createTx) {
        flow.push.createBtcScript()
      }
    })

    flow.swap.room.on(`request ${flow.actions.eosWithdraw}`, () => {
      if (flow.state.eosWithdrawTx && flow.state.secret) {
        flow.push.eosWithdraw()
      }
    })
  }
}

export default BTC2EOS
