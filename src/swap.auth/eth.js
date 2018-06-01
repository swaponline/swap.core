import SwapCore from '../swap.core'


class EthAuth {

  constructor() {
    this.account = null
  }

  login(privateKey) {
    if (privateKey) {
      this.account = SwapCore.env.web3.eth.accounts.privateKeyToAccount(privateKey)
    }
    else {
      this.account = SwapCore.env.web3.eth.accounts.create()
    }

    SwapCore.env.web3.eth.accounts.wallet.add(this.account.privateKey)

    return this.account
  }

  getPublicData() {
    return {
      address: this.account.address,
      publicKey: this.account.publicKey,
    }
  }
}


export default new EthAuth()
