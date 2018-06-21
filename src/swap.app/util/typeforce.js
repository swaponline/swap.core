import typeforce from 'typeforce'
import constants from '../constants'


const check = (...args) => {
  try {
    return typeforce(...args)
  }
  catch (err) {
    console.error(err)
    return false
  }
}

const isNumeric = (value) => !isNaN(parseFloat(value)) && isFinite(value)

const isCoinName = (value) => Object.keys(constants.COINS).map((v) => v.toLowerCase()).includes(value.toLowerCase())

const isCoinAddress = {
  [constants.COINS.eth]: (value) => typeof value === 'string' && /^0x[A-Fa-f0-9]{40}$/.test(value),
  [constants.COINS.btc]: (value) => typeof value === 'string' && /^[A-Za-z0-9]{34}$/.test(value),
  [constants.COINS.nim]: (value) => typeof value === 'string' && /^0x[A-Fa-f0-9]{40}$/.test(value),
}

const isPublicKey = {
  [constants.COINS.eth]: '?String', // TODO we don't have / use eth publicKey
  [constants.COINS.btc]: (value) => typeof value === 'string' && /^[A-Za-z0-9]{66}$/.test(value),
  [constants.COINS.nim]: '?String', // TODO we don't have / use nim publicKey
}


export default {
  t: typeforce,
  check,
  isNumeric,
  isCoinName,
  isCoinAddress,
  isPublicKey,
}
