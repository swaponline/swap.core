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
      json: true
    })
  }

  lazyInit() {
    return SwapApp.env.eos.getInstance().then((eosInstance) => {
      this.eos = eosInstance
    })
  }

  open({ participantAccount, secretHash, amount }, finishCallback) {
    const { userAccount, swapAccount, tokenAccount } = this.getAccounts()

    return this.lazyInit()
      .then(() => {
        return this.getSwaps().then((swaps) => {
          if (swaps && swaps.rows) {
            return swaps.rows.length
          } else {
            return 0
          }
        })
      })
      .then((swapID) => {
        const quantity = amountToAsset(amount)

        return this.eos.transaction({
          actions: [
            {
              account: swapAccount,
              name: 'open',
              authorization: [{
                actor: userAccount,
                permission: 'active'
              }],
              data: {
                secretHash,
                eosOwner: userAccount,
                btcOwner: participantAccount,
                quantity: quantity
              }
            },
            {
              account: tokenAccount,
              name: 'transfer',
              authorization: [{
                actor: userAccount,
                permission: 'active'
              }],
              data: {
                from: userAccount,
                to: swapAccount,
                quantity: quantity,
                memo: swapID
              }
            }
          ]
        }).then((transaction) => {
          const openTx = transaction.transaction_id
          if (typeof finishCallback === 'function') {
            finishCallback({ openTx, swapID })
          }
          return { openTx, swapID }
        })
    })
  }

  withdraw({ swapID, secret }, finishCallback) {
    const { userAccount, swapAccount } = this.getAccounts()

    return this.lazyInit().then(() => {
      return this.eos.transaction({
        actions: [
          {
            account: swapAccount,
            name: 'withdraw',
            authorization: [{
              actor: userAccount,
              permission: 'active'
            }],
            data: {
              swapID,
              secret
            }
          }
        ]
      }).then((transaction) => {
        const eosWithdrawTx = transaction.transaction_id

        if (typeof finishCallback === 'function') {
          finishCallback(eosWithdrawTx)
        }
        return eosWithdrawTx
      })
    })
  }

  refund({ swapID }, finishCallback) {
    const { userAccount, swapAccount } = this.getAccounts()

    this.lasyInit().then(() => {
      this.eos.transaction({
        actions: [
          {
            account: swapAccount,
            name: 'refund',
            authorization: [{
              actor: userAccount,
              permission: 'active'
            }],
            data: {
              swapID
            }
          }
        ]
      }).then((eosRefundTx) => {
        if (typeof finishCallback === 'function') {
          finishCallback(eosRefundTx)
        }
        return eosRefundTx
      })
    })
  }

  getLockTime() {
    const utcNow = () => Math.floor(Date.now() / 1000)
    return utcNow() + 3600 * 3
  }
}

export default EosSwap
