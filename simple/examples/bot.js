//const swap = require('simple.swap.core')
const swap = require('./../src/index')

const {
  on: { onFinish },
  room: { ready },
  orders: { request, subscribe },
  swap: { onStep, start },
  history: { save, get, remove },
} = swap.helpers

const { wallet, auth, room, orders } = swap.setup

const doSwap = async order => {
  console.log('new order', order.id)
  if (Number(order.buyAmount) > 0.01) {
    const swap = await request(order)

    console.log('starting swap', swap.flow._flowName, swap.id)

    await start(swap)

    save(swap)

    await onFinish(swap)

    console.log('finished swap', swap.id)
    remove(swap)
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
