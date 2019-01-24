import bitcoin from 'bitcoinjs-lib'
import Events from 'swap.app/Events'
import EventEmitter from 'events'
import Eos from "eosjs"

let storage = {}

let room = new EventEmitter()
room.connection = {}
room.connection.hasPeer = jest.fn(peer => true)
room.sendMessage = jest.fn()
room.unsubscribe = jest.fn()
room.sendConfirmation = jest.fn((peer, values) => {
  const possibleSenderPeers = ['swaponlinBTC', 'swaponlinEOS', peer]

  let fromPeer = null
  switch (peer) {
    case possibleSenderPeers[0]:
      fromPeer = possibleSenderPeers[1]
      break

    case possibleSenderPeers[1]:
      fromPeer = possibleSenderPeers[0]
      break

    default:
      fromPeer = possibleSenderPeers[2]
  }

  room.emit(values.event, {
    ...values.data, ...{
      fromPeer,
      swapId: values.data.swapId
    }
  })
})

const btcKey = bitcoin.ECPair.fromWIF('KwMUy5TKPK51UTF7MFZWtdkWe4DV1uWQVcSc9Jz6g51MCn8jTSQd')
btcKey.getPublicKey = () => btcKey.getPublicKeyBuffer().toString('hex')

const eosMockProvider = () => {
  return Eos({
    mockTransactions: 'pass',
    httpEndpoint: 'https://jungle.eosio.cr',
    chainId: '038f4b0fc8ff18a4f0842a8f0564611f6e96e8535901dd45e43ac8691a1c4dca',
    keyProvider: '5K7B6Pgwkv4Yydmw94Hk95uZnW2T4PMNRMKoJzAbfKPRQRkEcEm',
    verbose: true
  })
}

const accounts = {
  eth: {
    address: '0xdadadadadadadadadadadadadadadadadadadada',
  },
  btc: btcKey,
  eos: {
    address: 'swaponlinBTC'
  }
}

const mockSwapApp = {
  // static
  required: app => true,
  shared: () => mockSwapApp,
  is: app => true,

  isSwapApp: () => true,
  isMainNet: () => true,
  env: {
    bitcoin,
    web3: {
      eth: {
        getGasPrice: jest.fn(gas => Promise.resolve(2e9)),
        getBalance: jest.fn(address => 3e18),
        Contract: function () {
          const view = (getValue, state = {}) => () => ({
            call: jest.fn(() => getValue(state)),
            state,
          })

          const action = (emitter) => () => ({
            send: jest.fn(() => emitter),
            estimateGas: jest.fn(() => 1e5),
            emitter,
          })

          this.state = { swapExists: false, secret: null }

          this.methods = {
            swaps:      jest.fn(view(
              () => ({
                secretHash: 'c0933f9be51a284acb6b1a6617a48d795bdeaa80',
                balance: this.state.swapExists ? '2' : '0',
              }),
              { swapExists: false }
            )),
            getBalance: jest.fn(view(
              () => this.state.swapExists ? '2' : '0',
              { swapExists: false }
            )),
            getSecret:  jest.fn(view(
              async () => this.state.secret
            )),

            createSwap: jest.fn(action(new EventEmitter)),
            withdraw:   jest.fn(action(new EventEmitter)),
            refund:     jest.fn(action(new EventEmitter)),

            approve:    jest.fn(action(new EventEmitter)),
          }
        },
      },
    },
    storage: {
      getItem: (key) => storage[key],
      setItem: (key, value) => storage[key] = value,
    },
    sessionStorage: {
      getItem: (key) => storage[key],
      setItem: (key, value) => storage[key] = value,
      remoteItem: (key, value) => delete storage[key],
    },
    eos: {
      getInstance: () => {
        return Promise.resolve(eosMockProvider())
      }
    }
  },
  services: {
    auth: {
      getPublicData() {
        return accounts
      },
      accounts: accounts
    },
    room,
  },
  flows: {},
  swaps: {},
}
const util = {
  pullProps: (obj, ...keys) => obj,
}

class SwapInterface {
  _initSwap(app) {}
}

const constants = {
  COINS: { btc: 'BTC', eth: 'ETH', swap: 'SWAP', usdt: 'USDT', eos: 'EOS' },
}

export default mockSwapApp
export { SwapInterface, constants, util, Events }
