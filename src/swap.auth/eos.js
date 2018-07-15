import SwapApp from 'swap.app'

const login = ({ accountName = '', masterPrivateKey = ''} = {}) => ({
  accountName, masterPrivateKey
})

const getPublicData = ({ accountName = '' } = {}) => ({ accountName })

export default {
  login,
  getPublicData
}