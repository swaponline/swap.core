const coins = require('./coins');


(async () => {

/*  const GHOSTbalance = await coins.GHOST.networks.testnet.getBalance('XPtT4tJWyepGAGRF9DR4AhRkJWB3DEBXT2')
  console.log('GHOST balance: ', GHOSTbalance)*/

  let addr, balance

  console.log('getBalance: GHOST testnet, zero-balance')
  addr = 'XPtT4tJWyepGAGRF9DR4AhRkJWB3DEBXT2'
  balance = await coins.GHOST.networks.testnet.getBalance(addr)
  console.log('<<<', balance)

  console.log('getBalance: GHOST mainnet, non-zero-balance')
  addr = 'GgWNhjFhSCBDfw85vPvXZyqXXrEqVFSSvB'
  balance = await coins.GHOST.networks.mainnet.getBalance(addr)
  console.log('<<<', balance)

  /*
  const balanceNEXT = await fetchBalance({
    coin: coins.NEXT,
    network: coins.NEXT.networks.mainnet,
    address: 'XNnXeCcxvPTVFo3DvWERBd6pWZvCfMn9AV'
  })
  console.log('GHOST balance: ', balanceGHOST)
  */
})()

