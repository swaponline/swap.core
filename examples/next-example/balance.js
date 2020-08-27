const coins = require('./coins');


(async () => {

  let addr, balance


  // GHOST

  console.log('getBalance: GHOST testnet, zero-balance')
  addr = 'XPtT4tJWyepGAGRF9DR4AhRkJWB3DEBXT2'
  balance = await coins.GHOST.testnet.getBalance(addr)
  console.log('<<<', balance)

  console.log('getBalance: GHOST mainnet, non-zero-balance')
  addr = 'GgWNhjFhSCBDfw85vPvXZyqXXrEqVFSSvB'
  balance = await coins.GHOST.mainnet.getBalance(addr)
  console.log('<<<', balance)


  // BTC

  console.log('getBalance: BTC testnet, zero-balance')
  addr = '2N3pDTovNkg5QqgkMttjwekPNBZo3m7XfGZ'
  balance = await coins.BTC.testnet.getBalance(addr)
  console.log('<<<', balance)

  console.log('getBalance: BTC testnet, non-zero-balance')
  addr = 'mkHS9ne12qx9pS9VojpwU5xtRd4T7X7ZUt'
  balance = await coins.BTC.testnet.getBalance(addr)
  console.log('<<<', balance)


  console.log('getBalance: BTC mainnet, zero-balance')
  addr = '1EPTHasxZ1Hx6tBb8qfLZ3hAEr45y9viU9'
  balance = await coins.BTC.mainnet.getBalance(addr)
  console.log('<<<', balance)

  console.log('getBalance: BTC mainnet, non-zero-balance')
  addr = '3JurbUwpsAPqvUkwLM5CtwnEWrNnUKJNoD'
  balance = await coins.BTC.mainnet.getBalance(addr)
  console.log('<<<', balance)


  // NEXT

  console.log('getBalance: NEXT mainnet, zero-balance')
  addr = 'XZUsFMpkgPjjfT1c9CwKKyY4TzdQhiKNju'
  balance = await coins.NEXT.mainnet.getBalance(addr)
  console.log('<<<', balance)

  console.log('getBalance: NEXT mainnet, non-zero-balance')
  addr = 'XMkvVVvuQJp4mp5hoVHUPumbnvh63xJsN4'
  balance = await coins.NEXT.mainnet.getBalance(addr)
  console.log('<<<', balance)



})()

