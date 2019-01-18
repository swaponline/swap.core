import SwapApp from 'swap.app'
import BigNumber from 'bignumber.js'
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

    this.partialHandler   = {
      buyAmount: () => false,
      sellAmount: () => false,
    }

    this.destination = null

    this._update({
      ...data,
      isMy: data.owner.peer === SwapApp.services.room.peer,
    })

    this._onMount()
  }

  _onMount() {
    SwapApp.services.room.on('request swap', ({ orderId, participant, participantMetadata, destination }) => {
      if (orderId === this.id && this.requests.length < 10 && !this.requests.find(({ participant: { peer } }) => peer === participant.peer)) {
        const reputation = SwapApp.env.swapsExplorer && typeof SwapApp.env.swapsExplorer.getVerifiedReputation === 'function' ?
          SwapApp.env.swapsExplorer.getVerifiedReputation(participantMetadata) : 0

        this.requests.push({ participant, destination, reputation, isPartial: false })

        events.dispatch('new order request', {
          orderId,
          participant,
          destination,
          participantMetadata
        })
      }
    })

    SwapApp.services.room.on('request partial fulfilment', ({ orderId, participant, updatedOrder }) => {
      if (orderId === this.id) {
        const { buyAmount, sellAmount } = updatedOrder

        const filteredUpdatedOrder = {
          buyAmount,
          sellAmount,
        }

        this.requests.push({ participant, updatedOrder: filteredUpdatedOrder })

        events.dispatch('new partial fulfilment request', {
          orderId,
          participant,
          updatedOrder: filteredUpdatedOrder,
        })

        console.log('filteredUpdatedOrder', filteredUpdatedOrder)

        this._autoReplyToPartial('buyAmount', filteredUpdatedOrder, participant)
        this._autoReplyToPartial('sellAmount', filteredUpdatedOrder, participant)
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

  _autoReplyToPartial(changedKey, updatedOrder, participant) {
    if (!this.isPartial) {
      return
    }

    if (!updatedOrder[changedKey]) {
      return
    }

    console.log(changedKey, updatedOrder)
    updatedOrder[changedKey] = BigNumber(updatedOrder[changedKey])

    console.log(this[changedKey], updatedOrder)
    if (this[changedKey].comparedTo(updatedOrder[changedKey]) === 0) {
      return
    }

    const handler = this.partialHandler[changedKey]

    if (typeof handler !== 'function') {
      return
    }

    if (!participant) return

    const { peer } = participant

    const newOrder = handler(updatedOrder, this)

    if (!newOrder || !newOrder.buyAmount || !newOrder.sellAmount) {
      this.declineRequestForPartial(participant.peer)
    } else {
      const { buyAmount, sellAmount } = newOrder

      this.acceptRequestForPartial({ buyAmount, sellAmount }, participant.peer)
    }
  }

  /**
   *
   * @param updatedOrder.buyAmount - optional String
   * @param updatedOrder.sellAmount - optional String
   * @param callback - callback will receive updated order
   * @param conditionHandler - autoreply to new order proposal
   */
  sendRequestForPartial(updatedOrder = {}, requestOptions = {}, callback, conditionHandler) {
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

    SwapApp.services.room.on('accept partial fulfilment', function ({ orderId, newOrderId, newOrder }) {
      if (orderId === self.id) {
        this.unsubscribe()

        // locate new order
        const newOrder = self.collection.getByKey(newOrderId)

        if (!newOrder) {
          console.error('Party created no order with id =', newOrderId)
          return callback(null, false)
        }

        // check that values match updatedOrder and old order
        const ok = newOrder.buyCurrency === self.buyCurrency
                && newOrder.sellCurrency === self.sellCurrency

        if (!ok) return callback(newOrder, false)

        // if condition to check is not given,
        // we need logic on client app side
        if (typeof conditionHandler !== 'function') {
          // TODO: pass destination and participantMetadata
          return callback(newOrder)
        }

        // else, we can start swap automatically
        const newOrderIsGood = conditionHandler(self, newOrder)

        if (newOrderIsGood) {
          // request that new order
          newOrder.sendRequest(accepted => callback(newOrder, accepted), requestOptions)
        } else {
          callback(newOrder, false)
        }
      }
    })

    SwapApp.services.room.on('decline partial fulfilment', function ({ orderId }) {
      if (orderId === self.id) {
        this.unsubscribe()

        // TODO think about preventing user from sent requests every N seconds
        callback(null, false)
      }
    })
  }

  /**
   *
   * @param callback - awaiting for response - accept / decline
   */
  sendRequest(callback, requestOptions = {}) {
    const self = this

    const { address, participantMetadata } = requestOptions

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

    const participant = SwapApp.services.auth.getPublicData()

    SwapApp.services.room.sendMessagePeer(this.owner.peer, {
      event: 'request swap',
      data: {
        orderId: this.id,
        participant,
        participantMetadata, // seller can verify reputation of participant before he will accept request
        destination: {
          address
        }
      },
    })

    SwapApp.services.room.on('accept swap request', function ({ orderId }) {
      if (orderId === self.id) {
        this.unsubscribe()

        self.update({
          isProcessing: true,
          isRequested: false,
          destination: {
            ...self.destination,
            participantAddress: address,
          },
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

  /**
   *
   * @param {Object} newValues - { buyAmount, sellAmount } - new order values
   * @param {String} participantPeer - participant peer id
   */
  acceptRequestForPartial(newValues, participantPeer) {
    const { buyCurrency, sellCurrency } = this
    const { buyAmount, sellAmount } = newValues

    const updatedRequests = this.requests.filter(({ participant: { peer } }) => {
      return peer !== participantPeer
    })

    this.update({
      isRequested: false,
      requests: updatedRequests,
    })

    const newOrder = this.collection.create({
      buyAmount,
      sellAmount,
      buyCurrency,
      sellCurrency,
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
    // TODO this removes all requests, we need to remove only one referenced
    const updatedRequests = this.requests.filter(({ participant: { peer } }) => {
      return peer !== participantPeer
    })

    this.update({
      isRequested: false,
      requests: updatedRequests,
    })

    SwapApp.services.room.sendMessagePeer(participantPeer, {
      event: 'decline partial fulfilment',
      data: {
        orderId: this.id,
      },
    })
  }

  /**
   *
   * @param {String} type - ['buyAmount','sellAmount']
   * @param {function} handler - function to be called on partial request to that order
   */
  setRequestHandlerForPartial(type, handler) {
    if (!this.isMy) {
      throw new Error(`RequestHandlerError: Not an owner`)
    }
    if (type !== 'buyAmount' && type !== 'sellAmount') {
      throw new Error(`RequestHandlerError: Key = '${type}' is not in ['buyAmount','sellAmount']`)
    }

    this.partialHandler[type] = handler

    return this
  }

  acceptRequest(participantPeer) {
    const { participant, destination } = this.requests.find(({ participant: { peer } }) => peer === participantPeer)
    const { address } = destination

    this.update({
      isRequested: false,
      isProcessing: true,
      participant,
      destination: {
        ...this.destination,
        participantAddress: address,
      },
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
