const express = require("express")
const bodyParser = require('body-parser')

const request = require('superagent')
const app = express()


const portDefault = 32251

const nextCoinNode = {
  testnet: {
    port: 17078
  },
  mainnet: {
    port: 7078
  }
}

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))


// /next/:network
// /next/:network/addr/:address'
// /next/:network/tx/send
// /next/:network/tx/:txId
// /next/:network/rawtx/:txId
// /next/:network/txs/:address

const sendRequest = ({ network, rpcMethod, params = [], onSuccess, onError }) => {
  const user = {
    name: 'test',
    password: 'test'
  }
  const nextCoinNodePort = nextCoinNode[network].port
  const url = `http://${user.name}:${user.password}@localhost:${nextCoinNodePort}`

  const body = `{"jsonrpc":"1.0","id":"curltext","method":"getblockchaininfo","params":[]}`
  const header = 'content-type:text/plain;'

  return request
    .post(url)
    .set('content-type', 'text/plain')
    .send(body)
    .then((req) => {
      const data = JSON.parse(req.text)
      onSuccess(data)
    })
    .catch((e) => {
      console.log('Error', e)
      let resultError = e
      if (e.code == 'ECONNREFUSED') {
        resultError = new Error('Node is offline')
      }
      onError(resultError)
    })
}

app.get('/next/:network', async (req, res) => {

  const { network } = req.params
  const networks = Object.keys(nextCoinNode)

  if (!networks.includes(network)) {
    res.status(400).json({ error: 'bad request: wrong network' })
    return
  }

  sendRequest({
    network,
    rpcMethod: 'getblockchaininfo',
    onSuccess: (data) => {
      /*res.status(200).json({
        rawtx: answer.hex,
      })*/
      res.status(200).json(data)
    },
    onError: (e) => {
      res.status(503).json({ error: e.message })
    },
  })
})


app.listen(process.env.PORT ? process.env.PORT : portDefault)
console.log(`NEXT proxy listening: localhost:${portDefault} ⇄ NEXT.coin node`)