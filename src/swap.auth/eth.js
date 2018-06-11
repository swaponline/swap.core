import SwapApp from 'swap.app'


const login = (_privateKey) => {
  const storageKey = `${SwapApp.network}:eth:privateKey`
  const privateKey = _privateKey || SwapApp.env.storage.getItem(storageKey)
  let account

  if (privateKey) {
    account = SwapApp.env.web3.eth.accounts.privateKeyToAccount(privateKey)
  }
  else {
    account = SwapApp.env.web3.eth.accounts.create()
  }

  SwapApp.env.web3.eth.accounts.wallet.add(account.privateKey)

  if (!_privateKey) {
    SwapApp.env.storage.setItem(storageKey, account.privateKey)
  }

  return account
}

const getPublicData = ({ address, publicKey }) => ({
  address,
  publicKey,
})


export default {
  login,
  getPublicData,
}
