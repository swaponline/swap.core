const testnet = require('./testnet')
const mainnet = require('./mainnet')

const getConfig = require('./getConfig')


const { EthTokenSwap } = require('../core-connector').swaps
const tokenSwap = require('./tokenSwap')

module.exports = {
  testnet: getConfig(testnet),
  mainnet: getConfig(mainnet),

  tokenSwap: (config) => new EthTokenSwap(tokenSwap(config)()),
}
