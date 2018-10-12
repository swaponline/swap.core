import SwapApp from 'swap.app'


const login = (_privateKey) => {
  const storageKey = `${SwapApp.network}:ltc:privateKey`
  let privateKey = _privateKey || SwapApp.env.storage.getItem(storageKey)
  let account

  const network = (
    SwapApp.isMainNet()
      ? SwapApp.env.coininfo.litecoin.main
      : SwapApp.env.coininfo.litecoin.test
  ).toBitcoinJS()

  if (!privateKey) {
    privateKey = SwapApp.env.bitcoin.ECPair.makeRandom({ network }).toWIF()
  }

  account = new SwapApp.env.bitcoin.ECPair.fromWIF(privateKey, network)

  account.getPublicKey = () => account.getPublicKeyBuffer().toString('hex')
  account.getPrivateKey = () => privateKey

  if (!_privateKey) {
    SwapApp.env.storage.setItem(storageKey, privateKey)
  }

  return account
}

const getPublicData = (account) => ({
  address: account.getAddress(),
  publicKey: account.getPublicKey(),
})


export default {
  login,
  getPublicData,
}
