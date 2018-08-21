const bitcoin = require('bitcoinjs-lib')

const OmniSwap = require('./OmniSwap')

const net = process.env.NETWORK === 'testnet'
  ? bitcoin.networks.testnet
  : bitcoin.networks.bitcoin

const _unspents = require('./fixtures/unspents')

const api = {
  fetchUnspents: jest.fn(() => _unspents),
  fetchBalance: jest.fn(),
  fetchOmniBalance: jest.fn(),
  broadcastTx: jest.fn(),
}

const owner = bitcoin.ECPair.makeRandom({ network: net })
const bobby = bitcoin.ECPair.makeRandom({ network: net })

test('creates script', async () => {
  const swap = new OmniSwap({ assetId: 31, ...api }) // 31 for Tether

  const data = {
    owner, to_address: bobby.getAddress(),
    amount: 10, doSend: true }

  const tx = await swap.simpleSend(data)

  expect(api.broadcastTx).toHaveBeenCalled()

  expect(tx.outs[1].script).toEqual(Buffer.from('6a146f6d6e69000000000000001f000000003b9aca00', 'hex'))
})
