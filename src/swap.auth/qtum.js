import SwapApp from 'swap.app'
import { networks, generateMnemonic } from 'qtumjs-wallet'


const login = (_privateKey, app) => {
  SwapApp.required(app)

  const storageKey = `${app.network}:qtum:privateKey`
  const privateKey = _privateKey || app.env.storage.getItem(storageKey)
  let account

  const network = app.isMainNet()
    ? networks.mainnet
    : networks.testnet

  // TODO check format private key
  if (privateKey) {
    account = network.fromWIF(privateKey)
  } else {
    const mnemonic  = generateMnemonic()
    account = network.fromMnemonic(mnemonic)
    app.env.storage.setItem(storageKey, account.toWIF())
    console.log('account', account.address)
  }

  return account
}

const getPublicData = (account) => ({
  address: account.address,
  publicKey: null,
})


export default {
  login,
  getPublicData,
}
