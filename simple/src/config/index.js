const testnet = require('./testnet')
const localnet = require('./localnet')
const mainnet = require('./mainnet')

const getConfig = require('./getConfig')

const swap = require('swap.core')
const { EthTokenSwap } = swap.swaps
const tokenSwap = require('./tokenSwap')

module.exports = {
  testnet: getConfig(testnet),
  localnet: getConfig(localnet),
  mainnet: getConfig(mainnet),

  tokenSwap: (config) => new EthTokenSwap(tokenSwap(config)()),
}
