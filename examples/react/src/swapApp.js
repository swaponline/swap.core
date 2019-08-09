import bitcoin from 'bitcoinjs-lib'

import { ethereumInstance, bitcoinInstance } from './instances'
import { web3 } from './instances/ethereum'

import SwapApp from 'swap.app'
import SwapAuth from 'swap.auth'
import SwapRoom from 'swap.room'
import SwapOrders from 'swap.orders'
import { EthSwap, BtcSwap, QtumSwap } from 'swap.swaps'
import { ETH2BTC, BTC2ETH, QTUM2BTC, BTC2QTUM } from 'swap.flows'


// Swap ------------------------------------------------------ /

SwapApp.setup({
  network: 'testnet',

  env: {
    web3,
    bitcoin,
    Ipfs: window.Ipfs,
    IpfsRoom: window.IpfsRoom,
    storage: window.localStorage,
  },

  services: [
    new SwapAuth({
      eth: null, // or pass private key here
      btc: null,
      qtum: null,
    }),
    new SwapRoom({
      config: {
        Addresses: {
          Swarm: [
            // '/dns4/discovery.libp2p.array.io/tcp/9091/wss/p2p-websocket-star',
            '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
            // '/dns4/star.wpmix.net/tcp/443/wss/p2p-websocket-star',
          ],
        },
      },
    }),
    new SwapOrders(),
  ],

  swaps: [
    new EthSwap({
      address: '0x830aef165b900fa7dc6b219f062c5784f6436d67',
      abi:
      [{"constant":false,"inputs":[{"name":"_secret","type":"bytes32"},{"name":"_ownerAddress","type":"address"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_participantAddress","type":"address"}],"name":"getSecret","outputs":[{"name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"participantSigns","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"swaps","outputs":[{"name":"secret","type":"bytes32"},{"name":"secretHash","type":"bytes20"},{"name":"createdAt","type":"uint256"},{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_secretHash","type":"bytes20"},{"name":"_participantAddress","type":"address"}],"name":"createSwap","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[],"name":"ratingContractAddress","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_ownerAddress","type":"address"}],"name":"getBalance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_participantAddress","type":"address"}],"name":"refund","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"createdAt","type":"uint256"}],"name":"CreateSwap","type":"event"},{"anonymous":false,"inputs":[],"name":"Withdraw","type":"event"},{"anonymous":false,"inputs":[],"name":"Close","type":"event"},{"anonymous":false,"inputs":[],"name":"Refund","type":"event"}],
      fetchBalance: (address) => ethereumInstance.fetchBalance(address),
    }),
    new BtcSwap({
      fetchBalance: (address) => bitcoinInstance.fetchBalance(address),
      fetchUnspents: (scriptAddress) => bitcoinInstance.fetchUnspents(scriptAddress),
      broadcastTx: (txRaw) => bitcoinInstance.broadcastTx(txRaw),
    }),
    new QtumSwap({
      abi: [{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"swaps","outputs":[{"name":"participantAddress","type":"address"},{"name":"secret","type":"bytes32"},{"name":"secretHash","type":"bytes20"},{"name":"createdAt","type":"uint256"},{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_secretHash","type":"bytes20"},{"name":"_participantAddress","type":"address"}],"name":"createSwap","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"_ownerAddress","type":"address"},{"name":"_participantAddress","type":"address"}],"name":"getSecret","outputs":[{"name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_ownerAddress","type":"address"},{"name":"_participantAddress","type":"address"}],"name":"getBalance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_secret","type":"bytes32"},{"name":"_ownerAddress","type":"address"},{"name":"_participantAddress","type":"address"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_participantAddress","type":"address"}],"name":"refund","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}],
      address: '3d30e97d67dd1332b80858437c1b3e82caaaa15b',
      gasPrice: 400,
      gasLimit: 3e6,
    })
  ],

  flows: [
    ETH2BTC,
    BTC2ETH,
    QTUM2BTC,
    BTC2QTUM
  ],
})

export default SwapApp.shared()

window.SwapApp = SwapApp.shared()
