import Swap from 'swap.swap'

import on from './on'

const request = order => new Promise((resolve, reject) =>
  order.sendRequest(accepted => {
    if (accepted) {
      resolve(order)
    }
  })).then(order => {
    console.log('order accepted', order.id)
    return new Swap(order)
  })

const ready = room => on(room, 'ready')

module.exports = { request, ready }
