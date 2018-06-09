import SwapApp from '../../swap.app'


const login = (_privateKey) => {
  const storageKey = `${SwapApp.network}:eth:privateKey`
  const privateKey = _privateKey || SwapApp.env.storage.getItem(storageKey)

  if (privateKey) {
    this.account = SwapApp.env.web3.eth.accounts.privateKeyToAccount(privateKey)
  }
  else {
    this.account = SwapApp.env.web3.eth.accounts.create()
  }

  SwapApp.env.storage.setItem(storageKey, this.account.privateKey)
  SwapApp.env.web3.eth.accounts.wallet.add(this.account.privateKey)

  return this.account
}

const getPublicData = ({ address, publicKey }) => ({
  address,
  publicKey,
})


export default {
  login,
  getPublicData,
}
