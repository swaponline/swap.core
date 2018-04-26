import { SwapApp } from './swap/index'


const web3 = new global.Web3(new global.Web3.providers.HttpProvider('https://rinkeby.infura.io/JCnK5ifEPH9qcQkX0Ahl'))


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
  web3Config: {
    instance: web3,
    gasLimit: 40 * 1e5,
  },
  getBalance: (currency) => {
    if (currency === 'eth') {
      return 10
    }
    else if (currency === 'btc') {
      return 1
    }
  }
})

app.on('ready', () => {
  console.log('swapApp ready')
  console.log('initial swaps', app.getSwaps())
})

app.on('user online', (peer) => {
  console.log('user online', peer)
})

app.on('user offline', (peer) => {
  console.log('user offline', peer)
})

app.on('new swaps', (swaps) => {
  console.log('new swaps', swaps)
})

app.on('new swap', (swap) => {
  console.log('new swap', swap)
})

app.on('remove swap', (swap) => {
  console.log('remove swap', swap)
})

app.on('new swap request', ({ swapId, participant }) => {
  console.error(`user ${participant.peer} requesting swap`, {
    swap: app.swapCollection.getByKey(swapId),
    participant,
  })
})


export {
  app,
}
