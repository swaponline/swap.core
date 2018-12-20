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

const isCoinName = (value) => Object.values(constants.COINS).map((v) => v.toLowerCase()).includes(value.toLowerCase())

const isCoinAddress = {
  [constants.COINS.eos]: '?String',
  [constants.COINS.eth]: (value) => typeof value === 'string' && /^0x[A-Fa-f0-9]{40}$/.test(value),
  [constants.COINS.btc]: (value) => typeof value === 'string' && /^[A-Za-z0-9]{35}$/.test(value),
  [constants.COINS.ltc]: (value) => typeof value === 'string' && /^[A-Za-z0-9]{34}$/.test(value),
  [constants.COINS.nim]: (value) => typeof value === 'string' && /^0x[A-Fa-f0-9]{40}$/.test(value),
  [constants.COINS.noxon]: (value) => typeof value === 'string' && /^0x[A-Fa-f0-9]{40}$/.test(value),
  [constants.COINS.swap]: (value) => typeof value === 'string' && /^0x[A-Fa-f0-9]{40}$/.test(value),
  [constants.COINS.usdt]: (value) => typeof value === 'string',
}

const isPublicKey = {
  [constants.COINS.eos]: '?String',
  [constants.COINS.eth]: '?String', // TODO we don't have / use eth publicKey
  [constants.COINS.btc]: (value) => typeof value === 'string' && /^[A-Za-z0-9]{66}$/.test(value),
  [constants.COINS.ltc]: (value) => typeof value === 'string' && /^[A-Za-z0-9]{66}$/.test(value),
  [constants.COINS.nim]: '?String', // TODO we don't have / use nim publicKey
  [constants.COINS.noxon]: '?String', // TODO we don't have / use nim publicKey
  [constants.COINS.swap]: '?String', // TODO we don't have / use nim publicKey
  [constants.COINS.usdt]: '?String', // TODO we don't have / use nim publicKey
}


export default {
  t: typeforce,
  check,
  isNumeric,
  isCoinName,
  isCoinAddress,
  isPublicKey,
}
