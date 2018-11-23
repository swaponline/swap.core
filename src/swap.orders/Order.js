import SwapApp from 'swap.app'
import events from './events'


class Order {

  /**
   *
   * @param {object}  parent
   * @param {object}  data
   * @param {string}  data.id
   * @param {object}  data.owner
   * @param {string}  data.owner.peer
   * @param {number}  data.owner.reputation
   * @param {object}  data.owner.<currency>
   * @param {string}  data.owner.<currency>.address
   * @param {string}  data.owner.<currency>.publicKey
   * @param {string}  data.buyCurrency
   * @param {string}  data.sellCurrency
   * @param {number}  data.buyAmount
   * @param {number}  data.sellAmount
   */
  constructor(parent, data) {
    this.id             = data.id
    this.isMy           = null
    this.owner          = null
    this.participant    = null
    this.buyCurrency    = null
    this.exchangeRate   = null
    this.sellCurrency   = null
    this.buyAmount      = null
    this.sellAmount     = null

    this.collection       = parent
    this.requests         = [] // income requests
    this.isRequested      = false // outcome request status
    this.isProcessing     = false // if swap isProcessing
    this.isPartial        = false
    this.destinationBuyAddress = null // (!my Buy==Sell)
    this.destinationSellAddress = null// (!my Sell==Buy)

    this._update({
      ...data,
      isMy: data.owner.peer === SwapApp.services.room.peer,
    })

    this._onMount()
  }

  _onMount() {
    SwapApp.services.room.on('request swap', ({ orderId, participant }) => {
      if (orderId === this.id && !this.requests.find(({ participant: { peer } }) => peer === participant.peer)) {
        this.requests.push({ participant, isPartial: false })

        events.dispatch('new order request', {
          orderId,
          participant,
        })
      }
    })

    SwapApp.services.room.on('request partial fulfilment', ({ orderId, participant, updatedOrder }) => {
      if (orderId === this.id) {
        this.requests.push({ participant, updatedOrder })

        events.dispatch('new partial request', {
          orderId,
          participant,
          updatedOrder,
        })
      }
    })
  }

  _update(values) {
    Object.keys(values).forEach((key) => {
      this[key] = values[key]
    })
  }

  update(values) {
    this._update(values)
    this.collection._saveMyOrders()

    events.dispatch('swap update', this, values)
  }

  /**
   *
   * @param updatedOrder.buyAmount - optional String
   * @param updatedOrder.sellAmount - optional String
   * @param callback - callback will receive updated order id
   */
  sendRequestForPartial(updatedOrder = {}, callback, conditionHandler) {
    if (!this.isPartial) {
      throw new Error(`Cant request partial fulfilment for order ${this.id}`)
    }

    const { buyAmount, sellAmount } = updatedOrder
    updatedOrder = { buyAmount, sellAmount }

    if (!updatedOrder) {
      throw new Error(`No buyAmount, sellAmount given. Exit partial`)
    }

    const self = this

    if (SwapApp.services.room.peer === this.owner.peer) {
      console.warn('You are the owner of this Order. You can\'t send request to yourself.')
      return
    }

    const participant = SwapApp.services.auth.getPublicData()

    SwapApp.services.room.sendMessagePeer(this.owner.peer, {
      event: 'request partial fulfilment',
      data: {
        orderId: this.id,
        participant,
        updatedOrder,
      },
    })

    SwapApp.services.room.on('accept partial fulfilment', function ({ orderId, newOrderId }) {
      if (orderId === self.id) {
        this.unsubscribe()

        // locate new order
        const newOrder = self.collection.getByKey(newOrderId)

        // check that values match updatedOrder and old order
        const ok = newOrder.buyCurrency == self.buyCurrency
                && newOrder.sellCurrency == self.sellCurrency

        if (!ok) return callback(false)

        // if condition to check is not given,
        // we need logic on client app side
        if (typeof conditionHandler != 'function') {
          return callback(newOrderId)
        }

        // else, we can start swap automatically
        const newOrderIsGood = conditionHandler(self, newOrder)

        if (newOrderIsGood) {
          // request that new order
          newOrder.sendRequest(callback)
        } else {
          callback(false)
        }
      }
    })

    SwapApp.services.room.on('decline partial fulfilment', function ({ orderId }) {
      if (orderId === self.id) {
        this.unsubscribe()

        // TODO think about preventing user from sent requests every N seconds
        callback(false)
      }
    })
  }

  /**
   *
   * @param callback - awaiting for response - accept / decline
   */
  sendRequest(callback) {
    const self = this

    if (SwapApp.services.room.peer === this.owner.peer) {
      console.warn('You are the owner of this Order. You can\'t send request to yourself.')
      return
    }

    if (this.isRequested) {
      console.warn('You have already requested this swap.')
      return
    }

    this.update({
      isRequested: true,
    })

    SwapApp.services.room.sendMessagePeer(this.owner.peer, {
      event: 'request swap',
      data: {
        orderId: this.id,
        // TODO why do we send this info?
        participant,
      },
    })

    SwapApp.services.room.on('accept swap request', function ({ orderId }) {
      if (orderId === self.id) {
        this.unsubscribe()

        self.update({
          isProcessing: true,
          isRequested: false,
        })

        callback(true)
      }
    })

    SwapApp.services.room.on('decline swap request', function ({ orderId }) {
      if (orderId === self.id) {
        this.unsubscribe()

        self.update({
          isRequested: false,
        })

        // TODO think about preventing user from sent requests every N seconds
        callback(false)
      }
    })
  }

  acceptRequestForPartial(newValues, participantPeer) {
    const { buyCurrency, sellCurrency } = self
    const { buyAmount, sellAmount } = newValues

    const newOrder = self.collection.create({
      buyAmount,
      sellAmount,
      buyCurrency,
      sellCurrency,
      isPartial: false,
    })

    SwapApp.services.room.sendMessagePeer(participantPeer, {
      event: 'accept partial fulfilment',
      data: {
        orderId: this.id,
        newOrderId: newOrder.id,
      },
    })
  }

  declineRequestForPartial(participantPeer) {
    SwapApp.services.room.sendMessagePeer(participantPeer, {
      event: 'decline partial fulfilment',
      data: {
        orderId: this.id,
        newOrderId,
      },
    })
  }

  acceptRequest(participantPeer) {
    const { participant } = this.requests.find(({ participant: { peer } }) => peer === participantPeer)

    this.update({
      isRequested: false,
      isProcessing: true,
      participant,
      requests: [],
    })

    SwapApp.services.room.sendMessagePeer(participantPeer, {
      event: 'accept swap request',
      data: {
        orderId: this.id,
      },
    })
  }

  declineRequest(participantPeer) {
    let index

    this.requests.some(({ participant: { peer } }, _index) => {
      if (peer === participantPeer) {
        index = _index
      }
      return index !== undefined
    })

    const requests = [
      ...this.requests.slice(0, index),
      ...this.requests.slice(index + 1)
    ]

    this.update({
      isRequested: false,
      requests,
    })

    SwapApp.services.room.sendMessagePeer(participantPeer, {
      event: 'decline swap request',
      data: {
        orderId: this.id,
      },
    })
  }
}


export default Order
