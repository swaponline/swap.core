/* eslint-disable no-await-in-loop */
import debug from 'debug'
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
  btcWithdraw: async () => {
    const { secret, scriptValues } = flow.state

    let btcWithdrawTx = null
    while (!btcWithdrawTx) {
      debug('swap.core:flow')('try withdraw btc...')
      try {
        btcWithdrawTx = await flow.btcSwap.withdraw({ scriptValues, secret }, null, null, 'sha256')
      } catch (err) {
        console.error(err)
        await sleep(5000)
      }
    }

    return btcWithdrawTx.txid
  },
  refund: () => {
    const { participant: { eos: { address } } } = flow.swap

    return flow.eosSwap.refund({
      btcOwner: address,
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
  verifyScript: async () => {
    const { buyAmount: value } = flow.swap
    const { scriptValues } = flow.state
    const recipientPublicKey = this.app.services.auth.accounts.btc.getPublicKey()

    const eosLockPeriod = flow.eosSwap.getLockPeriod()
    const now = Math.floor(Date.now() / 1000)
    const lockTime = now + eosLockPeriod

    let errorMessage = true
    while (errorMessage) {
      debug('swap.core:flow')('try verify script...')
      errorMessage = await flow.btcSwap.checkScript(scriptValues, {
        value,
        recipientPublicKey,
        lockTime,
      }, 'sha256')

      if (errorMessage) {
        console.error(errorMessage)
        await sleep(5000)
      }
    }
  },
  revealedSecret: async () => {
    const { owner: eosOwnerData, participant: btcOwnerData } = flow.swap
    const eosOwner = eosOwnerData.eos.address
    const btcOwner = btcOwnerData.eos.address

    let secret = null
    while (!secret) {
      debug('swap.core:flow')('try fetch secret...')
      secret = await flow.eosSwap.fetchSecret({ eosOwner, btcOwner })
      if (!secret) {
        await sleep(5000)
      }
    }

    return secret
  },
  eosWithdrawTx: () => new Promise(resolve => {
    flow.swap.room.once(flow.actions.eosWithdraw, ({ eosWithdrawTx, secret }) => {
      resolve(eosWithdrawTx)
    })
    flow.swap.room.sendMessage({
      event: `request ${flow.actions.eosWithdrawTx}`,
    })
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

    this.eosSwap = this.app.swaps[constants.COINS.eos]
    this.btcSwap = this.app.swaps[constants.COINS.btc]

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
        flow.transact.btcWithdraw().then((btcWithdrawTx) => {
          flow.finishStep({ btcWithdrawTx })
          flow.push.btcWithdraw()
        })
      },
    ]
  }

  tryRefund() {
    const flow = this

    return flow.transact.refund().then((eosRefundTx) => {
      flow.setState({ eosRefundTx })
    })
  }

  async isRefundSuccess() {
    return true
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
