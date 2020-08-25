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


app.get('/next/:network', async (req, res) => {

  //const { network } = req.params

  const network = 'mainnet'
  if (!network) {
    res.status(400).json({ error: 'bad request' })
  }
  
  
  const user = {
    name: 'test',
    password: 'test'
  }
  const nextCoinNodePort = nextCoinNode[network].port
  const url = `http://${user.name}:${user.password}@localhost:${nextCoinNodePort}`

  //const method = 'getblockchaininfo'
  const body = '{"jsonrpc":"1.0","id":"curltext","method":"getblockchaininfo","params":[]}'
  const header = 'content-type:text/plain;'

  request
    .post(url)
    .set('content-type', 'text/plain')
    .send(body)
    .then((req) => {
      const answer = JSON.parse(req.text)
      if (!answer) {
        res.status(503).json({ error: 'api answer empty' })
      }
      /*res.status(200).json({
        rawtx: answer.hex,
      })*/
      res.status(200).json(answer)
    })
    .catch((e) => {
      console.log('Error', e)
      res.status(503).json({ error: e.message })
    })

})

app.listen((process.env.PORT) ? process.env.PORT : portDefault)
console.log(`NEXT proxy listening: localhost:${portDefault} ⇄ NEXT.coin node`)