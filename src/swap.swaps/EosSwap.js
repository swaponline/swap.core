import SwapApp, { SwapInterface, constants } from 'swap.app'

const amountToUnits = amount =>
  Number.parseFloat(amount).toFixed(4) * 10**4

const amountToAsset = amount =>
  Number.parseFloat(amount).toFixed(4).concat(' EOS')

export default class EosSwap extends SwapInterface {
  constructor(options) {
    super()

    this._swapName = constants.COINS.eos

    this.swapAccount = options.swapAccount

    this.userAccount = SwapApp.services.auth.accounts.eos.getAccount()
  }

  getAccounts = () => ({
    userAccount: this.userAccount,
    swapAccount: this.swapAccount,
    tokenAccount: 'eosio.token'
  })

  open({ participantAccount, secretHash, amount }) {
    const { userAccount, swapAccount, tokenAccount } = this.getAccounts()

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
            quantity: amountToUnits(amount)
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
            to: swapAccount
          }
        }
      ]
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
}