const coins = require('./coins');


(async () => {

  // create account
  const mnemonic = 'praise you muffin lion enable neck grocery crumble super myself license ghost'
  const account = coins.GHOST.testnet.accountFromMnemonic(mnemonic)
  console.log('account =', account)
  console.log('address =', account.address.toString())


  // create TX
  const amount = 1 * (10 ** coins.GHOST.precision) // 1 Ghost coin
  const to = 'XPtT4tJWyepGAGRF9DR4AhRkJWB3DEBXT2';
  const rawTx = await coins.GHOST.testnet.createTx({ account, amount, to })
  console.log('tx created:', rawTx)

  // publish TX
  // const txid = await coins.GHOST.testnet.publishRawTx(rawTx)
  // console.log('tx sended, txid =', txid)

  // show TX URL
  // const txUrl = coins.GHOST.testnet.getTxUrl(txid)
  // console.log('txUrl =:', txUrl)


})()
