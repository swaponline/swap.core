const swap = require('simple.swap.core')

const { on } = swap.helpers
const { ready } = swap.helpers.room
const { request, subscribe } = swap.helpers.orders
const { onStep, start } = swap.helpers.swap

const doSwap = async order => {
  console.log('new order', order.id)
  if (order.buyAmount > 10) {
    const swap = await request(order)

    console.log('starting swap', swap.flow._flowName, swap.id)

    start(swap)

    await on('finish', swap)

    console.log('finished swap', swap.id)
  }
}

swap.setup().then(async ({ wallet, auth, room, orders }) => {
  const info = await wallet.getBalance()
  console.log('balance:', info)

  await ready(room)
  console.log('info:', wallet.view())

  orders.on('new orders', orders => orders.map(doSwap))
  orders.on('new order', doSwap)
})
