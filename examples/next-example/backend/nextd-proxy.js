const express = require("express")
const bodyParser = require('body-parser')

const request = require('superagent')
const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))


const portDefault = 32251

const nextCoinNode = {
  testnet: {
    port: 17078
  },
  mainnet: {
    port: 7078
  }
}

const networks = Object.keys(nextCoinNode)

const allowedRpcMethods = [
  'getblockchaininfo',
  'getreceivedbyaddress'
]


const sendRequest = ({ network, rpcMethod, rpcMethodParams = [], onSuccess, onError, appRes }) => {
  
  if (!networks.includes(network)) {
    appRes.status(400).json({ error: `bad request: wrong network ${network}, expected ${networks}` })
    return
  }

  if (!allowedRpcMethods.includes(rpcMethod)) {
    appRes.status(400).json({ error: `bad request: wrong rpcMethod ${rpcMethod}, expected ${allowedRpcMethods}` })
    return
  }

  const user = { name: 'test', password: 'test' }
  const nodePort = nextCoinNode[network].port
  const url = `http://${user.name}:${user.password}@localhost:${nodePort}`

  const bodyJson = {
    'jsonrpc': '1.0',
    'id': 'curltext',
    'method': rpcMethod,
    'params': rpcMethodParams
  }
  const body = JSON.stringify(bodyJson)

  return request
    .post(url)
    .set('content-type', 'text/plain')
    .send(body)
    .then((req) => {
      const data = JSON.parse(req.text)
      console.log('data=', data)
      if (data.error === null) {
        onSuccess(data.result)
      } else {
        throw new Error(data.error)
      }
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


/*
Planning proxy interface:

/next/:network
/next/:network/addr/:address'
/next/:network/tx/send
/next/:network/tx/:txId
/next/:network/rawtx/:txId
/next/:network/txs/:address
*/

app.get('/next/:network', async (req, res) => {

  const { network } = req.params

  sendRequest({
    network,
    rpcMethod: 'getblockchaininfo',
    rpcMethodParams: [],
    onSuccess: (data) => {
      /*res.status(200).json({
        rawtx: answer.hex,
      })*/
      res.status(200).json(data)
    },
    onError: (e) => {
      res.status(503).json({ error: e.message })
    },
    appRes: res,
  })
})


app.get('/next/:network/addr/:address', async (req, res) => {

  const { network, address } = req.params

  sendRequest({
    network,
    rpcMethod: 'getreceivedbyaddress',
    //rpcMethodParams: [address],
    rpcMethodParams: [{"addresses": ["XwnLY9Tf7Zsef8gMGL2fhWA9ZmMjt4KPwg"]}],
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