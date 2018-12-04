import SwapApp, { constants } from 'swap.app'

const Wallet = require('./wallet')

const configFactory = require('./config')

const network = process.env.NETWORK

let app

module.exports = (settings => {
  if (app) return app

  const getConfig = configFactory[network || 'testnet']

  const config = getConfig({ contracts: {}, ...settings })

  SwapApp.setup(config)

  const wallet = new Wallet(SwapApp, constants, config)

  const { auth, room, orders } = SwapApp.services

  app = {
    wallet,
    auth,
    room,
    orders,
  }

  return app
})()
