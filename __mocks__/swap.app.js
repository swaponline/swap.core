import bitcoin from 'bitcoinjs-lib'
import Events from 'swap.app/Events'
import EventEmitter from 'events'

let storage = {}

let room = new EventEmitter()
room.sendMessage = jest.fn()
room.unsubscribe = jest.fn()

const btcKey = bitcoin.ECPair.fromWIF('KwMUy5TKPK51UTF7MFZWtdkWe4DV1uWQVcSc9Jz6g51MCn8jTSQd')
btcKey.getPublicKey = () => btcKey.getPublicKeyBuffer().toString('hex')

const mockSwapApp = {
  isMainNet: () => true,
  env: {
    bitcoin,
    web3: {
      eth: {
        getBalance: jest.fn(address => 3e18),
        Contract: function () {
          const view = (value) => () => ({
            call: jest.fn(() => value)
          })

          const action = (emitter) => () => ({
            send: jest.fn(() => emitter),
            emitter,
          })

          this.methods = {
            swaps:      jest.fn(view({ balance: '2' })),
            getBalance: jest.fn(view('2')),
            createSwap: jest.fn(action(new EventEmitter)),
            withdraw:   jest.fn(action(new EventEmitter)),
            refund:     jest.fn(action(new EventEmitter)),
          }
        },
      },
    },
    storage: {
      getItem: (key) => storage[key],
      setItem: (key, value) => storage[key] = value,
    }
  },
  services: {
    auth: {
      accounts: {
        eth: {
          address: '0xdadadadadadadadadadadadadadadadadadadada',
        },
        btc: btcKey,
      }
    },
    room,
  },
  flows: {},
  swaps: {},
}
const util = {
  pullProps: (obj, ...keys) => obj,
}

const SwapInterface = function () {

}

const constants = {
  COINS: { btc: 'BTC', eth: 'ETH', swap: 'SWAP', usdt: 'USDT' },
}

export default mockSwapApp
export { SwapInterface, constants, util, Events }
