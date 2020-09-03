const coins = require('./coins');

(async () => {
  console.log(await coins.GHOST.testnet._connector.fetchUnspents(coins.GHOST.testnet.type, 'XPtT4tJWyepGAGRF9DR4AhRkJWB3DEBXT2'))
})()
