import bitcoinJsLib from 'bitcoinjs-lib'
import { SwapApp } from './swap/index'
import { web3 } from './instances/ethereum'
import { ethereumInstance, bitcoinInstance } from './instances'


// Chrome
// localStorage.setItem('ethPrivateKey', '0x0e9e9ce7f6fac62ee715cf4cf65095db65050b5f3173cfd41586e15ed8e4896e')
// localStorage.setItem('btcPrivateKey', 'cPEbuS2XrE1nb65XBk4me2wd5jtyQijDaKTBaBfLF74W5QrXKePs')

// Yandex
// localStorage.setItem('ethPrivateKey', '0x32c7a260f58d9217219a94504d8121eedefd15ab7febf4634a6ae9cac9166272')
// localStorage.setItem('btcPrivateKey', 'cN2N9ZMWxHAsrRmerTxZfLNzXPGyJsTUDQH9dCCVCqiE9uTnAEaB')

const ethPrivateKey = localStorage.getItem('ethPrivateKey')
const btcPrivateKey = localStorage.getItem('btcPrivateKey')

const ethAccount = ethereumInstance.login(ethPrivateKey)
const btcAccount = bitcoinInstance.login(btcPrivateKey)

localStorage.setItem('ethPrivateKey', ethAccount.privateKey)
localStorage.setItem('btcPrivateKey', btcAccount.getPrivateKey())

const localClear = localStorage.clear.bind(localStorage)

global.clear = localStorage.clear = () => {
  localClear()
  localStorage.setItem('ethPrivateKey', ethAccount.privateKey)
  localStorage.setItem('btcPrivateKey', btcAccount.getPrivateKey())
}


const app = window.app = new SwapApp({
  me: {
    reputation: 10,
    eth: {
      address: ethAccount.address,
      publicKey: ethAccount.publicKey,
    },
    btc: {
      address: btcAccount.getAddress(),
      publicKey: btcAccount.getPublicKeyBuffer().toString('hex'),
    },
  },
  config: {
    ipfs: {
      Addresses: {
        Swarm: [
          '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
        ],
      },
    },
    btc: {

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
  bitcoinJsLib,
  ethAccount,
  btcAccount,
}
