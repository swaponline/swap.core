import debug from 'debug'
import SwapApp, { SwapInterface, constants } from 'swap.app'
import BigNumber from 'bignumber.js'


const amountToUnits = amount =>
  Number.parseFloat(amount.toString()).toFixed(4) * 10 ** 4

const amountToAsset = amount =>
  Number.parseFloat(amount.toString()).toFixed(4).concat(' EOS')

class EosSwap extends SwapInterface {
  constructor(options) {
    super()

    this._swapName = constants.COINS.eos

    this.swapAccount = options.swapAccount
    this.swapLockPeriod = options.swapLockPeriod

    this.eos = null
  }

  _initSwap(app) {
    super._initSwap(app)

    this.app = app
  }

  _lazyInit() {
    return this.app.env.eos.getInstance().then((eosInstance) => {
      this.eos = eosInstance
    })
  }

  _getAccounts = () => ({
    userAccount: this.app.services.auth.getPublicData().eos.address,
    swapAccount: this.swapAccount,
    tokenAccount: 'eosio.token',
  })

  _getAllSwaps() {
    return this.eos.getTableRows({
      code: this.swapAccount,
      scope: this.swapAccount,
      table: 'swap',
      json: true,
      limit: 1000,
    })
  }

  _findSwaps({ btcOwner, eosOwner }) {
    const encodedEosOwner = new BigNumber(this.eos.modules.format.encodeName(eosOwner, false))

    return this.eos.getTableRows({
      code: this.swapAccount,
      scope: this.swapAccount,
      table: 'swap',
      json: true,
      key_type: 'i64',
      index_position: 2,
      lower_bound: encodedEosOwner.toString(),
      upper_bound: encodedEosOwner.plus(1).toString(),
    }).then(result => result.rows.filter(row => row.eosOwner === eosOwner && row.btcOwner === btcOwner))
  }

  _findOpenSwapID({ btcOwner, eosOwner }) {
    return this._findSwaps({ btcOwner, eosOwner }).then(swaps => {
      const openSwap = swaps.find(swap => swap.status === 0)
      return openSwap ? openSwap.swapID : null
    })
  }

  _findActiveSwapID({ btcOwner, eosOwner }) {
    return this._findSwaps({ btcOwner, eosOwner }).then(swaps => {
      const activeSwap = swaps.find(swap => swap.status === 1)
      return activeSwap ? activeSwap.swapID : null
    })
  }

  open({ btcOwner, secretHash, amount }, finishCallback) {
    const { userAccount: eosOwner, swapAccount, tokenAccount } = this._getAccounts()

    const quantity = amountToAsset(amount)

    const openSwap = () => this.eos.transaction({
      actions: [
        {
          account: swapAccount,
          name: 'open',
          authorization: [{
            actor: eosOwner,
            permission: 'active',
          }],
          data: {
            secretHash,
            eosOwner,
            btcOwner,
            quantity,
          },
        },
      ],
    })

    const findSwapID = () => this._findOpenSwapID({ btcOwner, eosOwner })

    const depositFunds = (swapID) => {
      debug('swap.core:swaps')('depositFunds', swapID)

      return this.eos.transaction({
        actions: [
          {
            account: tokenAccount,
            name: 'transfer',
            authorization: [{
              actor: eosOwner,
              permission: 'active',
            }],
            data: {
              from: eosOwner,
              to: swapAccount,
              quantity,
              memo: swapID,
            },
          },
        ],
      }).then(transaction => ({ transaction, swapID }))
    }

    const finish = ({ transaction, swapID }) => {
      const openTx = transaction.transaction_id
      if (typeof finishCallback === 'function') {
        finishCallback({ openTx, swapID })
      }
      return { openTx, swapID }
    }

    return this._lazyInit()
      .then(openSwap.bind(this))
      .then(findSwapID.bind(this))
      .then(depositFunds.bind(this))
      .then(finish)
  }

  withdraw({ eosOwner, secret }, finishCallback) {
    const { userAccount: btcOwner, swapAccount } = this._getAccounts()

    const findSwapID = () => this._findActiveSwapID({ btcOwner, eosOwner })

    const withdrawDeposit = (swapID) => this.eos.transaction({
      actions: [
        {
          account: swapAccount,
          name: 'withdraw',
          authorization: [{
            actor: btcOwner,
            permission: 'active',
          }],
          data: {
            swapID, secret,
          },
        },
      ],
    })

    const finish = (transaction) => {
      const eosWithdrawTx = transaction.transaction_id

      if (typeof finishCallback === 'function') {
        finishCallback(eosWithdrawTx)
      }
      return eosWithdrawTx
    }

    return this._lazyInit()
      .then(findSwapID.bind(this))
      .then(withdrawDeposit.bind(this))
      .then(finish)
  }

  refund({ btcOwner }, finishCallback) {
    const { userAccount: eosOwner, swapAccount } = this._getAccounts()

    const findSwapID = () => this._findActiveSwapID({ btcOwner, eosOwner })

    const refundDeposit = (swapID) => this.eos.transaction({
      actions: [
        {
          account: swapAccount,
          name: 'refund',
          authorization: [{
            actor: eosOwner,
            permission: 'active',
          }],
          data: {
            swapID,
          },
        },
      ],
    })

    const finish = (transaction) => {
      const eosRefundTx = transaction.transaction_id

      if (typeof finishCallback === 'function') {
        finishCallback(eosRefundTx)
      }
      return eosRefundTx
    }

    return this._lazyInit()
      .then(findSwapID.bind(this))
      .then(refundDeposit.bind(this))
      .then(finish)
  }

  fetchSecret({ btcOwner, eosOwner }) {
    const fetchSecret = async () => {
      const swaps = await this._findSwaps({ btcOwner, eosOwner })
      const activeSwapID = swaps.find(swap => swap.status === 1)

      if (!activeSwapID) {
        const finishedSwap = swaps.reverse()
          .find(swap => swap.status === 2)

        if (finishedSwap) {
          return finishedSwap.secret
        }
      }

      return 0
    }

    return this._lazyInit()
      .then(fetchSecret)
  }

  getLockPeriod() {
    return this.swapLockPeriod
  }
}

export default EosSwap
