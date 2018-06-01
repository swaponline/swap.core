import bitcoin from 'bitcoinjs-lib'

import { ethereumInstance, bitcoinInstance } from './instances'
import { web3 } from './instances/ethereum'

import SwapCore from './swap/swap.core'
import SwapApp from './swap/swap.app'
import SwapAuth from './swap/swap.auth'
import SwapRoom from './swap/swap.room'
import SwapOrders from './swap/swap.orders'
import { EthSwap, BtcSwap } from './swap/swap.swaps'


SwapCore.configure({
  env: {
    web3,
    bitcoin,
    Ipfs: global.Ipfs,
    IpfsRoom: global.IpfsRoom,
    storage: global.localStorage,
  },
})

const app = new SwapApp({
  services: [
    new SwapAuth({
      eth: localStorage.getItem('ethPrivateKey'),
      btc: localStorage.getItem('btcPrivateKey'),
    }),
    new SwapRoom({
      ipfs: {
        EXPERIMENTAL: {
          pubsub: true,
        },
        config: {
          Addresses: {
            Swarm: [
              // '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
              '/dns4/star.wpmix.net/tcp/443/wss/p2p-websocket-star',
            ],
          },
        }
      },
    }),
    new SwapOrders({}),
  ],
  swaps: [
    new EthSwap({
      fetchBalance: (address) => ethereumInstance.fetchBalance(address),
    }),
    new BtcSwap({
      fetchBalance: (address) => bitcoinInstance.fetchBalance(address),
      fetchUnspents: (scriptAddress) => bitcoinInstance.fetchUnspents(scriptAddress),
      broadcastTx: (txRaw) => bitcoinInstance.broadcastTx(txRaw),
    }),
  ],
})

console.log('app', app)


export default app
