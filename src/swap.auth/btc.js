import SwapCore from '../swap.core'


class BtcAuth {

  constructor() {
    this.account = null
  }

  login(privateKey) {
    if (!privateKey) {
      privateKey = SwapCore.env.bitcoin.ECPair.makeRandom({ network: SwapCore.env.bitcoin.networks.testnet }).toWIF()
    }

    this.account = new SwapCore.env.bitcoin.ECPair.fromWIF(privateKey, SwapCore.env.bitcoin.networks.testnet)

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
