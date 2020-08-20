const swap = require('../core-wrapper')

const {
  history: { getAllFinished, getAllInProgress },
} = swap.helpers

swap.setup()

console.log('in progress:', getAllInProgress())
console.log('finished:', getAllFinished())

process.exit(0)
