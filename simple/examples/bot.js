//const swap = require('simple.swap.core')
const swap = require('./../src/index')

const {
  on: { onFinish },
  room: { ready },
  orders: { request, subscribe },
  swap: { onStep, start },
} = swap.helpers

const { wallet, auth, room, orders } = swap.setup

const doSwap = async order => {
  console.log('new order', order.id)
  if (order.buyAmount > 10) {
    const swap = await request(order)

    console.log('starting swap', swap.flow._flowName, swap.id)

    start(swap)

    await onFinish(swap)

    console.log('finished swap', swap.id)
  }
}

(async () => {
  const info = await wallet.getBalance()
  console.log('balance:', info)

  await ready(room)
  console.log('info:', wallet.view())

  orders.on('new orders', orders => orders.map(doSwap))
  orders.on('new order', doSwap)
})()
