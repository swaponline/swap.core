//const swap = require('simple.swap.core')
const swap = require('./../src/index')

const {
  room: { ready },
  history: { getAllFinished, getAllInProgress },
} = swap.helpers

const { wallet, auth, room, orders } = swap.setup();


(async () => {
  await ready(room)
  
  console.log('in progress:', getAllInProgress())
  console.log('finished:', getAllFinished())
})()
