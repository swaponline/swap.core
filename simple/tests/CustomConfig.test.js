const swap = require('../src/index')

const {
  room: { ready },
} = swap.helpers

const {
  tokenSwap,
} = swap.config

const { app, room } = swap.setup({
  COINS: {
    mytoken: 'MYTOKEN',
  },
  swaps: [
    tokenSwap({
      network: 'mainnet',
      name: 'DAI',
      decimals: 18,
      tokenAddress: '0x14a52cf6B4F68431bd5D9524E4fcD6F41ce4ADe9'
    }),
    tokenSwap({
      network: 'mainnet',
      name: 'BTRM',
      decimals: 18,
      tokenAddress: '0x14a52cf6B4F68431bd5D9524E4fcD6F41ce4ADe9'
    }),
  ]
})

beforeAll(async () => {
  await ready(room)
})

test('check token added', () => {
  console.log('coins', app.constants)

  expect(Object.values(app.swaps).length).toBe(6)
  expect(app.swaps.MYTOKEN).not.toBeNull()
})
