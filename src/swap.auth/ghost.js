import SwapApp from 'swap.app'


const login = (_privateKey, app) => {
  SwapApp.required(app)

  const storageKey = `${app.network}:ghost:privateKey`
  let privateKey = _privateKey || app.env.storage.getItem(storageKey)
  let account

  const network = (
    app.isMainNet()
      ? app.env.coininfo.ghost.main
      : app.env.coininfo.ghost.test
  ).toBitcoinJS()

  if (!privateKey) {
    privateKey = app.env.bitcoin.ECPair.makeRandom({ network }).toWIF()
  }

  account = new app.env.bitcoin.ECPair.fromWIF(privateKey, network)

  const { address } = app.env.bitcoin.payments.p2pkh({ pubkey: account.publicKey, network })
  const { publicKey } = account

  account.getPublicKey = () => publicKey.toString('hex')
  account.getPublicKeyBuffer = () => publicKey
  account.getPrivateKey = () => privateKey
  account.getAddress = () => address

  if (!_privateKey) {
    app.env.storage.setItem(storageKey, privateKey)
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
