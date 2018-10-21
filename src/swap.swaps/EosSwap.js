import SwapApp, { SwapInterface, constants } from 'swap.app'

const amountToUnits = amount =>
  Number.parseFloat(amount.toString()).toFixed(4) * 10**4

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

  _initSwap() {
  }

  getAccounts = () => ({
    userAccount: SwapApp.services.auth.getPublicData().eos.address,
    swapAccount: this.swapAccount,
    tokenAccount: 'eosio.token'
  })

  getSwaps() {
    return this.eos.getTableRows({
      code: this.swapAccount,
      scope: this.swapAccount,
      table: 'swap',
      json: true,
      limit: 1000
    })
  }

  lazyInit() {
    return SwapApp.env.eos.getInstance().then((eosInstance) => {
      this.eos = eosInstance
    })
  }

  findCurrentSwap({ btcOwner, eosOwner }) {
    const encodedEosOwner = new BigNumber(this.eos.modules.format.encodeName(eosOwner, false))

    return this.eos.getTableRows({
      code: this.swapAccount,
      scope: this.swapAccount,
      table: 'swap',
      json: true,
      key_type: 'i64',
      index_position: 2,
      lower_bound: encodedEosOwner.toString(),
      upper_bound: encodedEosOwner.plus(1).toString()
    }).then((result) => {
      const currentSwap = result.rows.find((swap) => {
        return swap.eosOwner == eosOwner &&
          swap.btcOwner == btcOwner &&
          (swap.status == 0 || swap.status == 1)
      })

      return currentSwap
    })
  }

  findSwapID({ btcOwner, eosOwner }) {
    return this.findCurrentSwap({ btcOwner, eosOwner }).then((swap) => {
      return swap.swapID
    })
  }

  open({ btcOwner, secretHash, amount }, finishCallback) {
    const { userAccount: eosOwner, swapAccount, tokenAccount } = this.getAccounts()

    const quantity = amountToAsset(amount)

    const openSwap = () => {
      return this.eos.transaction({
        actions: [
          {
            account: swapAccount,
            name: 'open',
            authorization: [{
              actor: eosOwner,
              permission: 'active'
            }],
            data: {
              secretHash,
              eosOwner: eosOwner,
              btcOwner: btcOwner,
              quantity: quantity
            }
          }
        ]
      })
    }

    const findSwapID = () => this.findSwapID({ btcOwner, eosOwner })

    const depositFunds = (swapID) => {
      console.log('depositFunds', swapID)

      return this.eos.transaction({
        actions: [
          {
            account: tokenAccount,
            name: 'transfer',
            authorization: [{
              actor: eosOwner,
              permission: 'active'
            }],
            data: {
              from: eosOwner,
              to: swapAccount,
              quantity: quantity,
              memo: swapID
            }
          }
        ]
      }).then(transaction => ({ transaction, swapID }))
    }

    const finish = ({ transaction, swapID }) => {
      const openTx = transaction.transaction_id
      if (typeof finishCallback === 'function') {
        finishCallback({ openTx, swapID })
      }
      return { openTx, swapID }
    }

    return this.lazyInit()
      .then(openSwap.bind(this))
      .then(findSwapID.bind(this))
      .then(depositFunds.bind(this))
      .then(finish)
  }

  withdraw({ eosOwner, secret }, finishCallback) {
    const { userAccount: btcOwner, swapAccount } = this.getAccounts()

    const findSwapID = () => this.findSwapID({ btcOwner, eosOwner })

    const withdrawDeposit = (swapID) => {
      return this.eos.transaction({
        actions: [
          {
            account: swapAccount,
            name: 'withdraw',
            authorization: [{
              actor: btcOwner,
              permission: 'active'
            }],
            data: {
              swapID, secret
            }
          }
        ]
      })
    }

    const finish = (transaction) => {
      const eosWithdrawTx = transaction.transaction_id

      if (typeof finishCallback === 'function') {
        finishCallback(eosWithdrawTx)
      }
      return eosWithdrawTx
    }

    return this.lazyInit()
      .then(findSwapID.bind(this))
      .then(withdrawDeposit.bind(this))
      .then(finish)
  }

  refund({ btcOwner }, finishCallback) {
    const { userAccount: eosOwner, swapAccount } = this.getAccounts()

    const findSwapID = () => this.findSwapID({ btcOwner, eosOwner })

    const refundDeposit = (swapID) => {
      return this.eos.transaction({
        actions: [
          {
            account: swapAccount,
            name: 'refund',
            authorization: [{
              actor: eosOwner,
              permission: 'active'
            }],
            data: {
              swapID
            }
          }
        ]
      })
    }

    const finish = (transaction) => {
      const eosRefundTx = transaction.transaction_id

      if (typeof finishCallback === 'function') {
        finishCallback(eosRefundTx)
      }
      return eosRefundTx
    }

    return this.lazyInit()
      .then(findSwapID.bind(this))
      .then(refundDeposit.bind(this))
      .then(finish)
  }

  getLockPeriod() {
    return this.swapLockPeriod
  }
}

export default EosSwap
