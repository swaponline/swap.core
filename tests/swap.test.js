import app from './setupSwapApp'

jest.unmock('swap.app')
jest.setTimeout(30000)

const orders = app.services.orders

const _ORDER = {
  buyCurrency: 'ETH',
  sellCurrency: 'BTC',
  buyAmount: 20,
  sellAmount: "1",
}

beforeAll(() => orders.getMyOrders().map(({ id }) => orders.remove(id)))

afterAll(done => require('rimraf')('.storage', done))

test('check app loaded', () => {
  expect(app.isTestNet()).toBe(true)
  expect(app.isMainNet()).toBe(false)
  expect(app.isLocalNet()).toBe(false)
})

xtest('sets the right type of room', () => {
  expect(app.services.room.roomName).toBe('swap.core.tests.swap.online')
})

xtest('create an order', async () => {
  orders.remove()
  orders.create(_ORDER)

  const myOrders = orders.items
    .filter(({ isMy }) => isMy)
    .map(({ buyCurrency, sellCurrency, buyAmount, sellAmount }) => ({ buyCurrency, sellCurrency, buyAmount, sellAmount }))

  expect(myOrders.length).toEqual(1)

  const { buyCurrency, sellCurrency, buyAmount, sellAmount } = myOrders[0]

  expect(buyCurrency).toEqual(_ORDER.buyCurrency)
  expect(buyAmount.comparedTo(_ORDER.buyAmount)).toEqual(0)
})
