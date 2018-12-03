const swap = require('simple.swap.core')
const repl = require('repl')

const { on } = swap.helpers
const { ready } = swap.helpers.room
const { request, subscribe } = swap.helpers.orders
const { get, onStep, start } = swap.helpers.swap

const swapID = process.argv[2]

console.clear()
console.log('IPFS loading...')
console.log('REPL getting ready...')

swap.setup().then(async ({ auth, room, wallet, orders }) => {
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
})
