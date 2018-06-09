import SwapApp from '../../swap.app'


const login = (_privateKey) => {
  const storageKey = `${SwapApp.network}:btc:privateKey`
  let privateKey = _privateKey || SwapApp.env.storage.getItem(storageKey)

  if (!privateKey) {
    privateKey = SwapApp.env.bitcoin.ECPair.makeRandom({ network: SwapApp.env.bitcoin.networks.testnet }).toWIF()
  }

  this.account = new SwapApp.env.bitcoin.ECPair.fromWIF(privateKey, SwapApp.env.bitcoin.networks.testnet)

  this.account.__proto__.getPublicKey = () => this.account.getPublicKeyBuffer().toString('hex')
  this.account.__proto__.getPrivateKey = () => privateKey

  SwapApp.env.storage.setItem(storageKey, privateKey)

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
