import Web3 from 'web3'
import bitcoin from 'bitcoinjs-lib'
import { SwapApp } from './swap/index'


const web3 = new Web3(new Web3.providers.HttpProvider('https://rinkeby.infura.io/JCnK5ifEPH9qcQkX0Ahl'))


const app = window.app = new SwapApp({
  me: {
    reputation: 10,
    eth: {
      address: '0x0',
      publicKey: '0x0',
    },
    btc: {
      address: '0x0',
      publicKey: '0x0',
    },
  },
  ipfsConfig: {
    Addresses: {
      Swarm: [
        '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
      ],
    },
  },
})

app.on('ready', () => {
  console.log('swapApp ready')
  console.log('initial orders', app.getOrders())
})

app.on('user online', (peer) => {
  console.log('user online', peer)
})

app.on('user offline', (peer) => {
  console.log('user offline', peer)
})

app.on('new orders', (swaps) => {
  console.log('new orders', swaps)
})

app.on('new order', (swap) => {
  console.log('new order', swap)
})

app.on('remove order', (swap) => {
  console.log('remove order', swap)
})

app.on('new order request', ({ swapId, participant }) => {
  console.error(`user ${participant.peer} requesting swap`, {
    swap: app.orderCollection.getByKey(swapId),
    participant,
  })
})


export {
  app,
  web3,
  bitcoin,
}
