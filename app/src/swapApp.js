import bitcoin from 'bitcoinjs-lib'

import { ethereumInstance, bitcoinInstance } from './instances'
import { web3 } from './instances/ethereum'

import swapApp from './swap/swap.app'
import SwapAuth from './swap/services/swap.auth'
import SwapRoom from './swap/services/swap.room'
import SwapOrders from './swap/services/swap.orders'
import { EthSwap, BtcSwap } from './swap/swap.swaps'


// Private Keys ---------------------------------------------- /

// Chrome
// localStorage.setItem('ethPrivateKey', '0xa6316e9e231fa70f2f41ce755f3846b74af10e8c5def8d333ec89af3b9b4193b')
// localStorage.setItem('btcPrivateKey', 'cUSH65TpCkU5rsMem8WND5itr3SVF192EAKA8E5ipqs15fTJiRbc')

// Yandex
// localStorage.setItem('ethPrivateKey', '0xe32a5cb068a13836b6bc80f54585bbfcc2d5d9089f0c5381b27d039b6d2404ec')
// localStorage.setItem('btcPrivateKey', 'cRF7Az481ffsuhhZ28x32Xk4ZvPh98zhKv7hCi1pKjifqvv7AcuX')

const localClear = localStorage.clear.bind(localStorage)

window.clear = localStorage.clear = () => {
  const ethPrivateKey = localStorage.getItem('ethPrivateKey')
  const btcPrivateKey = localStorage.getItem('btcPrivateKey')

  localClear()

  localStorage.setItem('ethPrivateKey', ethPrivateKey)
  localStorage.setItem('btcPrivateKey', btcPrivateKey)
}



// Swap ------------------------------------------------------ /

swapApp.setup({
  network: 'testnet',
  env: {
    web3,
    bitcoin,
    Ipfs: window.Ipfs,
    IpfsRoom: window.IpfsRoom,
    storage: window.localStorage,
  },
  services: [
    /*
      service ordering is very important, for example SwapOrders depends on SwapRoom,
      so the last one must be initialized first
     */
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
