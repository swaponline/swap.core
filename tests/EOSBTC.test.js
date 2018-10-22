import bitcoin from "bitcoinjs-lib"

import SwapApp from 'swap.app'
import Swap from 'swap.swap'
import { EosSwap, BtcSwap } from 'swap.swaps'
import { EOS2BTC, BTC2EOS } from 'swap.flows'
import fixtures from './fixtures'

jest.mock('swap.app')

const fromHexString = hexString =>
  new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))

const hash = (secret) => {
  return bitcoin.crypto.sha256(fromHexString(secret))
}

SwapApp.flows['EOS2BTC'] = EOS2BTC
SwapApp.flows['BTC2EOS'] = BTC2EOS

SwapApp.swaps['BTC'] = new BtcSwap({
  fetchBalance: jest.fn(address => 100),
  fetchUnspents: jest.fn(address => fixtures.unspents),
  broadcastTx: jest.fn()
})

const swapAccount = 'swaponline42'
const userAccountKey = 'eos:account'
SwapApp.swaps['EOS'] = new EosSwap({
  swapAccount,
  userAccountKey
})
SwapApp.env.storage.setItem(userAccountKey, 'userAccount')

const order = (type, { orderID, eosOwner, btcOwner }) => {
  let order = {
    'id': orderID,
    'isMy': true,

    'requests': [],
    'isRequested': true,
    'isProcessing': true
  }

  const eosOwnerData = {
    peer: eosOwner,
    eos: { address: eosOwner },
    btc: { address: '1Kf1dtmZGUoy482yXeoUuhfAJVKyD9JpWS', publicKey: '0386fbd9bd29d36e07dff34bc09173fb3035fb418ffbcc13c6d06334c1ff2e5422' },
  }
  const btcOwnerData = {
    peer: btcOwner,
    eos: { address: btcOwner },
    btc: { address: '1PdhGkf1spScMZtkAFGUaE7q7mX2X71Rr5', publicKey: '033a117cc4d164984c1e8fb58f39f08a17a2e615d77d8f7a35a7d9cdeb9e93ef4c' },
  }

  if (type === 'EOS2BTC') {
    order.buyCurrency = 'BTC'
    order.sellCurrency = 'EOS'
    order.buyAmount = '1'
    order.sellAmount = '10'

    order.owner = eosOwnerData
    order.participant = btcOwnerData
  } else if (type === 'BTC2EOS') {
    order.buyCurrency = 'EOS'
    order.sellCurrency = 'BTC'
    order.buyAmount = '10'
    order.sellAmount = '1'

    order.owner = btcOwnerData
    order.participant = eosOwnerData
  }

  return order
}

describe('successful swap between EOS and BTC', () => {
  jest.setTimeout(123123)

  const eosOwner = 'swaponlinEOS'
  const btcOwner = 'swaponlinBTC'
  const orderID = 'Qm-1231231'
  const btcAmount = 10
  const eosAmount = 100
  const secret = '9e7a0c24cb284ed7939e5d37901428fb1b293e56445c571a176fad2b948c0aaa'
  const secretHash = hash(secret)

  let eosOwnerSwap
  let btcOwnerSwap

  const checkSwapInstance = (type, swap) => {
    expect(swap.id).toEqual(orderID)

    expect(swap.events).toBeInstanceOf(Object)
    expect(swap.room).toBeInstanceOf(Object)
    expect(swap.flow).toBeInstanceOf(Object)

    expect(swap.room.swapId).toEqual(orderID)

    expect(swap.flow.swap).toEqual(swap)
    expect(swap.flow.steps).toBeInstanceOf(Array)
    expect(swap.flow.state.step).toEqual(0)
    expect(swap.flow.state.isWaitingForOwner).toEqual(false)

    if (type === 'EOS2BTC') {
      expect(swap.isMy).toEqual(true)
      expect(swap.buyCurrency).toEqual('BTC')
      expect(swap.sellCurrency).toEqual('EOS')
      expect(swap.room.peer).toEqual(eosOwnerSwap.participant.peer)
      expect(swap.owner.eos.address).toEqual(eosOwner)
      expect(swap.participant.eos.address).toEqual(btcOwner)
    } else if (type === 'BTC2EOS') {
      expect(swap.isMy).toEqual(true)
      expect(swap.buyCurrency).toEqual('EOS')
      expect(swap.sellCurrency).toEqual('BTC')
      expect(swap.room.peer).toEqual(btcOwnerSwap.participant.peer)
      expect(swap.owner.eos.address).toEqual(btcOwner)
      expect(swap.participant.eos.address).toEqual(eosOwner)
    }
  }

  const expectedEvents = {
    'submit secret': {
      type: 'BTC2EOS'
    },
    'create btc script': {
      type: 'room'
    },
    'verify script': {
      type: 'EOS2BTC'
    },
    'open swap': {
      type: 'room'
    },
    'eos withdraw': {
      type: 'room'
    },
    'btc withdraw': {
      type: 'room'
    }
  }

  beforeAll(() => {
    SwapApp.swaps['EOS']._initSwap()
    SwapApp.swaps['BTC']._initSwap()

    eosOwnerSwap = new Swap(orderID, order('EOS2BTC', { orderID, eosOwner, btcOwner }))
    SwapApp.env.storage.setItem(`swap.${orderID}`, undefined)
    btcOwnerSwap = new Swap(orderID, order('BTC2EOS', { orderID, eosOwner, btcOwner }))
  })

  test('ready', async () => {
    checkSwapInstance('EOS2BTC', eosOwnerSwap)
    checkSwapInstance('BTC2EOS', btcOwnerSwap)
  })

  test('flow', (done) => {
    let confirmedEvents = 0
    const eventNames = Object.keys(expectedEvents)

    const confirmEvent = (event, data) => {
      console.log(`${event} => ${JSON.stringify(data)}`)

      confirmedEvents++
      if (confirmedEvents === eventNames.length) {
        done()
      }
    }

    for (const event of eventNames) {
      if (expectedEvents[event].type === 'room') {
        SwapApp.services.room.once(event, (data) => {
          confirmEvent(event, data)
        })
      } else if (expectedEvents[event].type === 'EOS2BTC') {
        eosOwnerSwap.events.once(event, (data) => {
          confirmEvent(event, data)
        })
      } else if (expectedEvents[event].type === 'BTC2EOS') {
        btcOwnerSwap.events.once(event, (data) => {
          confirmEvent(event, data)
        })
      }
    }

    SwapApp.services.room.once('request create btc script', () => {
      setTimeout(() => {
        btcOwnerSwap.events.dispatch('submit secret', { secret, secretHash })
      })
    })
  })
})
