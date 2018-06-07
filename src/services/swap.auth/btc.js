import SwapApp from '../../swap.app'


class BtcAuth {

  constructor() {
    this.account = null
  }

  login(privateKey) {
    if (!privateKey) {
      privateKey = SwapApp.env.bitcoin.ECPair.makeRandom({ network: SwapApp.env.bitcoin.networks.testnet }).toWIF()
    }

    this.account = new SwapApp.env.bitcoin.ECPair.fromWIF(privateKey, SwapApp.env.bitcoin.networks.testnet)

    this.account.__proto__.getPublicKey = () => this.account.getPublicKeyBuffer().toString('hex')
    this.account.__proto__.getPrivateKey = () => privateKey

    return this.account
  }

  getPublicData() {
    return {
      address: this.account.address,
      publicKey: this.account.getPublicKey(),
    }
  }
}


export default new BtcAuth()
