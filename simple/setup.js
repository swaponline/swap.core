import SwapApp, { constants } from 'swap.app'

const Wallet = require('./wallet')

const configFactory = require('./config')

const network = process.env.NETWORK

module.exports = (settings) => new Promise(resolve => {
  const getConfig = configFactory[network || 'testnet']

  const config = getConfig({ contracts: {}, ...settings })

  SwapApp.setup(config)

  const wallet = new Wallet(SwapApp, constants, config)

  resolve({
    wallet,
    auth: SwapApp.services.auth,
    room: SwapApp.services.room,
    orders: SwapApp.services.orders,
  })
})
