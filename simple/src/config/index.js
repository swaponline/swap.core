const testnet = require('./testnet')
const localnet = require('./localnet')
const mainnet = require('./mainnet')

const getConfig = require('./getConfig')

module.exports = {
  testnet: getConfig(testnet),
  localnet: getConfig(localnet),
  mainnet: getConfig(mainnet),
}
