import constants from '../constants'
import typeforce from './typeforce'


const register = (code, precision) => {
  constants.COINS[code] = code.toUpperCase()
  constants.COINS_PRECISION[code.toUpperCase()] = precision
  typeforce.isCoinAddress[code.toUpperCase()] = typeforce.isCoinAddress.ETH
  typeforce.isPublicKey[code.toUpperCase()] = typeforce.isPublicKey.ETH
}

export default {
  register
}