import constants from '../constants'
import typeforce from './typeforce'

const register = (code, precision) => {
  constants.COINS[code] = code.toUpperCase()
  constants.COINS_PRECISION[code.toUpperCase()] = precision
  isCoinAddress[code.toUpperCase()] = typeforce.isCoinAddress.ETH
  isPublicKey[code.toUpperCase()] = typeforce.isPublicKey.ETH
}

export default {
  register
}