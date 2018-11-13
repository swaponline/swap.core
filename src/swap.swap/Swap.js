import BigNumber from 'bignumber.js'
import SwapApp, { Events, util,  } from 'swap.app'
import Room from './Room'


class Swap {

  constructor(id, order) {
    this.id                     = null
    this.isMy                   = null
    this.owner                  = null
    this.participant            = null
    this.buyCurrency            = null
    this.sellCurrency           = null
    this.buyAmount              = null
    this.sellAmount             = null
    this.ownerSwap              = null
    this.participantSwap        = null
    this.destinationBuyAddress  = null
    this.destinationSellAddress = null

    let data = SwapApp.env.storage.getItem(`swap.${id}`)

    if (!data) {
      order = order || SwapApp.services.orders.getByKey(id)

      data = this._getDataFromOrder(order)
    }

    this.update(data)

    this.events = new Events()

    this.room = new Room({
      swapId: id,
      participantPeer: this.participant.peer,
    })

    this.ownerSwap        = SwapApp.swaps[data.buyCurrency.toUpperCase()]
    this.participantSwap  = SwapApp.swaps[data.sellCurrency.toUpperCase()]

    const Flow = SwapApp.flows[`${data.sellCurrency.toUpperCase()}2${data.buyCurrency.toUpperCase()}`]


    if (!Flow) {
      throw new Error(`Flow with name "${data.sellCurrency.toUpperCase()}2${data.buyCurrency.toUpperCase()}" not found in SwapApp.flows`)
    }

    this.flow = new Flow(this)
  }

  _getDataFromOrder(order) {
    // TODO add check order format (typeforce)

    const data = util.pullProps(
      order,
      'id',
      'isMy',
      'owner',
      'participant',
      'buyCurrency',
      'sellCurrency',
      'buyAmount',
      'sellAmount',
      'destinationBuyAddress',
      'destinationSellAddress',
    )

    const { isMy, buyCurrency, sellCurrency, buyAmount, sellAmount, destinationBuyAddress, destinationSellAddress, ...rest } = data

    const swap = {
      ...rest,
      isMy,
      buyCurrency: isMy ? buyCurrency : sellCurrency,
      sellCurrency: isMy ? sellCurrency : buyCurrency,
      buyAmount: isMy ? buyAmount : sellAmount,
      sellAmount: isMy ? sellAmount : buyAmount,
      destinationBuyAddress: isMy ? destinationBuyAddress : destinationSellAddress,
      destinationSellAddress: isMy ? destinationSellAddress : destinationBuyAddress
    }

    if (!swap.participant && !isMy) {
      swap.participant = swap.owner
    }

    return swap
  }

  _pullRequiredData(data) {
    return util.pullProps(
      data,
      'id',
      'isMy',
      'owner',
      'participant',
      'buyCurrency',
      'sellCurrency',
      'buyAmount',
      'sellAmount',
      'destinationBuyAddress',
      'destinationSellAddress',
    )
  }

  _saveState() {
    const data = this._pullRequiredData(this)

    SwapApp.env.storage.setItem(`swap.${this.id}`, data)
  }

  setDestinationBuyAddress(address) {
    this.destinationBuyAddress = address;
    this._saveState();
  }

  setDestinationSellAddress(address) {
    this.destinationSellAddress = address;
    this._saveState();
  }

  update(values) {
    Object.keys(values).forEach((key) => {
      if (key === 'buyAmount' || key === 'sellAmount') {
        this[key] = new BigNumber(String(values[key]))
      }
      else {
        this[key] = values[key]
      }
    })
    this._saveState()
  }

  on(eventName, handler) {
    this.events.subscribe(eventName, handler)
  }

  off(eventName, handler) {
    this.events.unsubscribe(eventName, handler)
  }
}


export default Swap
