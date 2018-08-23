const request = require('request-promise-native')
const bitcoin = require('bitcoinjs-lib')

const net = process.env.NETWORK === 'testnet'
  ? bitcoin.networks.testnet
  : bitcoin.networks.bitcoin
  
const API = net === bitcoin.networks.testnet
  ? `https://test-insight.swap.online/insight-api`
  : `https://insight.bitpay.com/api`

const fetchUnspents = (address) => {
  console.log('GET', `${API}/addr/${address}/utxo/`)

  return request(`${API}/addr/${address}/utxo/`).then(JSON.parse)
}

const broadcastTx = (txRaw) => {
  return request.post(`${API}/tx/send`, {
    json: true,
    body: {
      rawtx: txRaw,
    },
  })
}

module.exports = {
  fetchUnspents,
  broadcastTx,
}
