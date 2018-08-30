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

    this.userAccount = SwapApp.services.auth.accounts.eos.getAccount()
  }

  _initSwap() {
  }

  getAccounts = () => ({
    userAccount: this.userAccount,
    swapAccount: this.swapAccount,
    tokenAccount: 'eosio.token'
  })

  getSwaps() {
    return SwapApp.env.eos.getTableRows({
      code: this.swapAccount,
      scope: this.swapAccount,
      table: 'swap',
      json: true
    })
  }

  async open({ participantAccount, secretHash, amount }) {
    const { userAccount, swapAccount, tokenAccount } = this.getAccounts()

    const swapID = (await this.getSwaps()).length || 0
    const quantity = amountToAsset(amount)

    return SwapApp.env.eos.transaction({
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
    }).then(({ transaction_id }) => {
      return {
        openTx: transaction_id,
        swapID
      }
    })
  }

  withdraw({ swapID, secret }) {
    const { userAccount, swapAccount } = this.getAccounts()

    return SwapApp.env.eos.transaction({
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
    })
  }

  refund({ swapID }) {
    const { userAccount, swapAccount } = this.getAccounts()

    return SwapApp.env.eos.transaction({
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
    })
  }

  getLockTime() {
    const utcNow = () => Math.floor(Date.now() / 1000)
    return utcNow() + 3600 * 3
  }
}

export default EosSwap