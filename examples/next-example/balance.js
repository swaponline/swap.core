const api = require('./api')

const address = 'XPtT4tJWyepGAGRF9DR4AhRkJWB3DEBXT2';

(async () => {
  const balance = await api.fetchBalance(address)
  console.log(balance)
})()

