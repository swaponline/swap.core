import SwapApp from '../../swap.app'


const login = (privateKey) => {
  if (privateKey) {
    this.account = SwapApp.env.web3.eth.accounts.privateKeyToAccount(privateKey)
  }
  else {
    this.account = SwapApp.env.web3.eth.accounts.create()
  }

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
