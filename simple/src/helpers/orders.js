import Swap from 'swap.swap'

import on from './on'
import checkService from './checkService'

export const request = order => new Promise((resolve, reject) =>
  order.sendRequest(accepted => {
    if (accepted) {
      resolve(order)
    }
  })).then(order => {
    console.log('order accepted', order.id)
    return new Swap(order.id)
  })

export const subscribe = (orders, handler) => {
  checkService(orders, 'orders')

  orders.on('new order', (order) => handler(order))
  orders.on('new orders', (orders) => orders.map(handler))
}
