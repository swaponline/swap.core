import { events } from './Events'
import room from './room'
import { storage } from './Storage'
import swapCollection from './swapCollection'


class SwapApp {

  constructor({ me, ipfsConfig, web3 }) {
    this.storage = storage
    this.swapCollection = swapCollection

    room.setIpfsConfig(ipfsConfig)
    storage.me = me

    room.subscribe('ready', () => {
      events.dispatch('ready')
    })
  }

  /**
   *
   * @param {object} data
   * @param {string} data.id
   * @param {string} data.ownerId
   * @param {string} data.buyCurrency
   * @param {string} data.sellCurrency
   * @param {number} data.buyAmount
   * @param {number} data.sellAmount
   */
  createSwap(data) {
    swapCollection.create(data)
  }

  on(eventName, handler) {
    events.subscribe(eventName, handler)
  }

  off(eventName, handler) {
    events.unsubscribe(eventName, handler)
  }
}


export default SwapApp
