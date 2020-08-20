// in your project use package:
// import { ... } from 'swap.core'

const { // and don't use this
  app,
  constants,
  util,
  swaps,
  flows,
  auth,
  room,
  orders,
  Swap } = require('../../../src')

console.log('core-connector: ',
  app &&
  constants &&
  util &&
  swaps &&
  flows &&
  auth &&
  room &&
  orders &&
  Swap ? '✔️' : '❌')

export default {
  app,
  constants,
  util,
  swaps,
  flows,
  auth,
  room,
  orders,
  Swap,
}