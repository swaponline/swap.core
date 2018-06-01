import SwapCore, { Collection } from '../swap.core'
import Order from './Order'
import events from './events'


class SwapOrdersService extends Collection {

  constructor() {
    super()

    this._name = 'orders'
    this.swapApp = null
  }

  init() {
    this.swapApp.room.subscribe('ready', () => {
      this._persistMyOrders()
    })

    this.swapApp.room.subscribe('user online', (peer) => {
      let myOrders = this.getMyOrders()

      if (myOrders.length) {
        // clean orders from other additional props
        myOrders = myOrders.map((item) => SwapCore.util.pullProps(
          item,
          'id',
          'owner',
          'buyCurrency',
          'sellCurrency',
          'buyAmount',
          'sellAmount',
          'isRequested',
          'isProcessing',
        ))

        console.log(`Send my orders to ${peer}`, myOrders)

        this.swapApp.room.sendMessage(peer, [
          {
            event: 'new orders',
            data: {
              orders: myOrders,
            },
          },
        ])
      }
    })

    this.swapApp.room.subscribe('user offline', (peer) => {
      const peerOrders = this.getPeerOrders(peer)

      if (peerOrders.length) {
        peerOrders.forEach(({ id }) => {
          this._handleRemove(id)
        })
      }
    })

    this.swapApp.room.subscribe('new orders', ({ fromPeer, orders }) => {
      // ductape to check if such orders already exist
      const filteredOrders = orders.filter(({ id }) => !this.getByKey(id))

      console.log(`Receive orders from ${fromPeer}`, filteredOrders)

      this._handleMultipleCreate(filteredOrders)
    })

    this.swapApp.room.subscribe('new order', ({ order: data }) => {
      this._handleCreate(data)
    })

    this.swapApp.room.subscribe('remove order', ({ orderId }) => {
      this._handleRemove(orderId)
    })
  }

  _persistMyOrders() {
    this.getMyOrders().forEach((orderData) => {
      this._handleCreate(orderData)
    })
  }

  _getUniqueId = (() => {
    let id = Date.now()

    return () => `${this.swapApp.room.peer}-${++id}`
  })()

  _create(data) {
    const order = new Order(this, {
      ...data,
      id: data.id || this._getUniqueId(),
    })

    this.append(order, order.id)

    return order
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
  _handleCreate(data) {
    const order = this._create(data)

    events.dispatch('new order', order)
  }

  _handleMultipleCreate(ordersData) {
    const orders = []

    ordersData.forEach((data) => {
      const order = this._create(data)
      orders.push(order)
    })

    events.dispatch('new orders', orders)
  }

  /**
   *
   * @param {string} orderId
   */
  _handleRemove(orderId) {
    const order = this.getByKey(orderId)

    this.removeByKey(orderId)
    events.dispatch('remove order', order)
  }

  _saveMyOrders() {
    let myOrders = this.items.filter(({ owner: { peer } }) => peer === this.swapApp.room.peer)

    // clean orders from other additional props
    // TODO need to add functionality to sync `requests` for users who going offline / online
    // problem: when I going online and persisting my orders need to show only online users requests,
    // but then user comes online need to change status. Ofc we can leave this bcs developers can do this themselves
    // with filters - skip requests where user is offline, but it looks like not very good
    myOrders = myOrders.map((item) => SwapCore.util.pullProps(
      item,
      'id',
      'owner',
      'buyCurrency',
      'sellCurrency',
      'buyAmount',
      'sellAmount',
      'participant',
      'requests',
      'isRequested',
      'isProcessing',
    ))

    SwapCore.env.storage.setItem('myOrders', myOrders)
  }

  getMyOrders() {
    return SwapCore.env.storage.getItem('myOrders') || []
  }

  getPeerOrders(peer) {
    return this.items.filter(({ owner }) => peer === owner.peer)
  }

  /**
   *
   * @param {object} data
   * @param {string} data.buyCurrency
   * @param {string} data.sellCurrency
   * @param {number} data.buyAmount
   * @param {number} data.sellAmount
   */
  create(data) {
    const order = this._create({
      ...data,
      owner: this.swapApp.auth.getPublicData(),
    })
    this._saveMyOrders()

    this.swapApp.room.sendMessage([
      {
        event: 'new order',
        data: {
          order: SwapCore.util.pullProps(
            order,
            'id',
            'owner',
            'buyCurrency',
            'sellCurrency',
            'buyAmount',
            'sellAmount',
            'isRequested',
            'isProcessing',
          ),
        },
      },
    ])
  }

  /**
   *
   * @param {string} orderId
   */
  remove(orderId) {
    this.removeByKey(orderId)
    this.swapApp.room.sendMessage([
      {
        event: 'remove order',
        data: {
          orderId,
        },
      },
    ])
    this._saveMyOrders()
  }

  on(eventName, handler) {
    events.subscribe(eventName, handler)
  }

  off(eventName, handler) {
    events.unsubscribe(eventName, handler)
  }
}


export default SwapOrdersService
