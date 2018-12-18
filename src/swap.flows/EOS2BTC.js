import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'


const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const transactionHandlers = (flow) => ({
  openSwap: () => {
    const { secretHash } = flow.state
    const { sellAmount: amount, participant } = flow.swap

    return flow.eosSwap.open({
      btcOwner: participant.eos.address,
      secretHash,
      amount,
    })
  },
  btcWithdraw: () => {
    const { secret, scriptValues } = flow.state

    const tryWithdraw = () => flow.btcSwap.withdraw({ scriptValues, secret }, null, null, 'sha256')

    return tryWithdraw()
      .catch((error) => {
        console.error('Cannot withdraw BTC, try again in 5 sec...')
        return sleep(5000).then(tryWithdraw)
      })
  },
  refund: () => {
    const { participant: btcOwner } = this.swap

    return flow.eosSwap.refund({
      btcOwner,
    })
  },
})

const pullHandlers = (flow) => ({
  btcScript: () => new Promise(resolve => {
    flow.swap.room.once(flow.actions.createBtcScript, resolve)
    flow.swap.room.sendMessage({
      event: `request ${flow.actions.createBtcScript}`,
    })
  }),
  verifyScript: () => {
    const { buyAmount } = flow.swap

    const getLockTime = () => {
      const eosLockTime = flow.eosSwap.getLockPeriod()
      const nowTime = Math.floor(Date.now() / 1000)

      return nowTime + eosLockTime
    }

    const checkScript = () => flow.btcSwap.checkScript(flow.state.scriptValues, {
      value: buyAmount,
      recipientPublicKey: SwapApp.services.auth.accounts.btc.getPublicKey(),
      lockTime: getLockTime(),
    }, 'sha256')

    return checkScript().then((errorMessage) => {
      if (errorMessage) {
        console.error(errorMessage, 'try again 5 sec...')
        return sleep(5000).then(checkScript)
      }
    })
  },
  revealedSecret: () => new Promise(resolve => {
    const { owner: eosOwnerData, participant: btcOwnerData } = flow.swap
    const eosOwner = eosOwnerData.eos.address
    const btcOwner = btcOwnerData.btc.address

    const fetchSecret = async () => {
      const swap = await this.eosSwap.findCurrentSwap({ eosOwner, btcOwner })
      const { secret } = swap

      return secret
    }

    return fetchSecret().then((secret) => {
      if (secret === 0) {
        console.error('Cannot fetch secret, try again in 5 sec...')
        return sleep(5000).then(fetchSecret)
      }
      return secret

    })
  }),
  eosWithdrawTx: () => new Promise(resolve => {
    flow.swap.room.once(flow.actions.eosWithdraw, resolve)
  }),
})

const pushHandlers = (flow) => ({
  openSwap() {
    const { openTx, swapID } = flow.state

    flow.swap.room.sendMessage({
      event: flow.actions.openSwap,
      data: {
        openTx, swapID,
      },
    })
  },
  btcWithdraw() {
    const { btcWithdrawTx } = flow.state

    flow.swap.room.sendMessage({
      event: flow.actions.btcWithdraw,
      data: {
        btcWithdrawTx,
      },
    })
  },
})

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
        btcWithdrawTx: null,
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
        flow.pull.btcScript().then(({ scriptValues, createTx }) => {
          const { secretHash } = scriptValues

          flow.finishStep({ scriptValues, secretHash, createTx })
        })
      },
      () => {
        flow.pull.verifyScript().then(() => {
          flow.finishStep()
        })
      },
      () => {
        flow.transact.openSwap().then(({ openTx, swapID }) => {
          flow.finishStep({ openTx, swapID })
          flow.push.openSwap()
        })
      },
      () => {
        flow.pull.revealedSecret().then(secret => {
          flow.finishStep({ secret })
        })
        flow.pull.eosWithdrawTx().then(eosWithdrawTx => {
          flow.setState({ eosWithdrawTx })
        })
      },
      () => {
        flow.transact.btcWithdraw().then(({ txid }) => {
          flow.finishStep({ btcWithdrawTx: txid })
          flow.push.btcWithdraw()
        })
      },
    ]
  }

  tryRefund() {
    const flow = this

    return flow.act.refund().then((eosRefundTx) => {
      flow.setState({ eosRefundTx })
    })
  }

  listenRequests() {
    const flow = this

    flow.swap.room.on(`request ${flow.actions.openSwap}`, () => {
      if (flow.state.openTx && flow.state.swapID) {
        flow.push.openSwap()
      }
    })

    flow.swap.room.on(`request ${flow.actions.btcWithdraw}`, () => {
      if (flow.state.btcWithdrawTx) {
        flow.push.btcWithdraw()
      }
    })
  }
}

export default EOS2BTC
