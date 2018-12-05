import Swap from 'swap.swap'

import on from './on'
import checkService from './checkService'

const request = order => new Promise((resolve, reject) =>
  order.sendRequest(accepted => {
    if (accepted) {
      resolve(order)
    }
  })).then(order => {
    console.log('order accepted', order.id)
    return new Swap(order.id)
  })

const subscribe = (orders, handler) => {
  checkService(orders, 'orders')

  orders.on('new order', (order) => handler(order))
  orders.on('new orders', (orders) => orders.map(handler))
}

const ready = room => {
  checkService(room, 'room')

  return on(room, 'ready')
}

module.exports = { request, ready, subscribe }
