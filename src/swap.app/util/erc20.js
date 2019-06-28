import constants from '../constants'
import { isCoinAddress, isPublicKey } from './typeforce'

const register = (code, precision) => {
  constants.COINS[code] = code.toUpperCase()
  constants.COINS_PRECISION[code.toUpperCase()] = precision
  isCoinAddress[code.toUpperCase()] = isCoinAddress.ETH
  isPublicKey[code.toUpperCase()] = isPublicKey.ETH
}

export default {
  register
}