import { events } from './Events'
import room from './room'
import { storage } from './Storage'
import orderCollection from './orderCollection'
import Swap from './Swap'


class OrderApp {

  constructor({ me, ipfsConfig, ethConfig, btcConfig }) {
    this.orderCollection = orderCollection
    this.storage = storage

    storage.me          = me
    storage.ipfsConfig  = ipfsConfig
    storage.ethConfig   = ethConfig
    storage.btcConfig   = btcConfig

    room.subscribe('ready', () => {
      events.dispatch('ready')
    })

    room.init()
  }

  getOrders() {
    return this.orderCollection.items
  }

  getMyOrders() {
    return this.orderCollection.getMyOrders()
  }

  /**
   *
   * @param {object} data
   * @param {string} data.id
   * @param {object} data.owner
   * @param {string} data.owner.peer
   * @param {number} data.owner.reputation
   * @param {object} data.owner.<currency>
   * @param {string} data.owner.<currency>.address
   * @param {string} data.owner.<currency>.publicKey
   * @param {string} data.buyCurrency
   * @param {string} data.sellCurrency
   * @param {number} data.buyAmount
   * @param {number} data.sellAmount
   */
  createOrder(data) {
    this.orderCollection.create(data)
  }

  removeOrder(orderId) {
    orderCollection.remove(orderId)
  }

  createSwap(orderId) {
    return new Swap(orderId)
  }

  on(eventName, handler) {
    events.subscribe(eventName, handler)
  }

  off(eventName, handler) {
    events.unsubscribe(eventName, handler)
  }
}


export default OrderApp
