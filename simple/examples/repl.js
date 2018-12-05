//const swap = require('simple.swap.core')
const swap = require('./../src/index')
const repl = require('repl')

const {
  on: { onFinish },
  room: { ready },
  orders: { request, subscribe },
  swap: { onStep, start },
} = swap.helpers

const { auth, room, wallet, orders } = swap.setup

const swapID = process.argv[2]

console.clear()
console.log('IPFS loading...')
console.log('REPL getting ready...')

(async () => {
  await ready(room)

  console.clear()
  console.log('Swap id =', swapID)
  console.log()

  const swap = get(swapID)

  console.log(`swap.flow.state =`, swap.flow.state)
  console.log()

  const swap_repl = repl.start()
  swap_repl.context.swap = swap
  swap_repl.context.auth = auth
  swap_repl.context.room = room
  swap_repl.context.wallet = wallet
  swap_repl.context.orders = orders
})()
