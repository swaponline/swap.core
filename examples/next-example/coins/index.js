const BTC = require('./BTC/BTC')
const GHOST = require('./GHOST/GHOST')
const NEXT = require('./NEXT/NEXT')

const coins = {
  'BTC': BTC,
  'GHOST': GHOST,
  'NEXT': NEXT
}

module.exports = coins