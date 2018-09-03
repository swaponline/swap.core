import SwapApp from 'swap.app'

const login = (accountNameKey) => {
  return accountNameKey
}
const getPublicData = (accountNameKey) => {
  return {
    address: window.localStorage.getItem(accountNameKey)
  }
}

export default {
  login,
  getPublicData
}