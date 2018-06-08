import SwapApp from '../../swap.app'


const login = (privateKey) => {
  if (!privateKey) {
    privateKey = SwapApp.env.bitcoin.ECPair.makeRandom({ network: SwapApp.env.bitcoin.networks.testnet }).toWIF()
  }

  this.account = new SwapApp.env.bitcoin.ECPair.fromWIF(privateKey, SwapApp.env.bitcoin.networks.testnet)

  this.account.__proto__.getPublicKey = () => this.account.getPublicKeyBuffer().toString('hex')
  this.account.__proto__.getPrivateKey = () => privateKey

  return this.account
}

const getPublicData = (account) => ({
  address: account.address,
  publicKey: account.getPublicKey(),
})


export default {
  login,
  getPublicData,
}
