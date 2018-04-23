import { events } from './Events'
import { storage } from './Storage'
import Collection from './Collection'
import Swap from './Swap'
import room from './room'


class SwapCollection extends Collection {

  constructor() {
    super()

    this._onMount()
  }

  _onMount() {
    SwapCollection.getMySwaps().forEach((swapData) => {
      this.create(swapData, false)
    })

    room.subscribe('user online', (peer) => {
      const mySwaps = SwapCollection.getMySwaps()

      console.log(`Send my orders to ${peer}`, mySwaps)

      if (mySwaps.length) {
        room.sendMessage(peer, mySwaps.map((swap) => ({
          event: 'new swap',
          data: swap,
        })))
      }
    })

    room.subscribe('new swap', (swapData) => {
      const { owner: { peer } } = swapData

      if (peer !== storage.me.peer) {
        this.create(swapData, false)
      }
    })
  }

  static getMySwaps() {
    const mySwaps = localStorage.getItem('mySwaps')

    return mySwaps ? JSON.parse(mySwaps) : []
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
   * @param {boolean} manual
   */
  create(data, manual = true) {
    const swap = new Swap(data)

    this.append(swap, swap.id)

    if (manual) {
      room.sendMessage([
        {
          event: 'new swap',
          data: swap,
        }
      ])

      // clean swaps from other additional props
      const swaps = this.items.map(({ id, owner, buyCurrency, sellCurrency, buyAmount, sellAmount }) => ({
        id,
        owner,
        buyCurrency,
        sellCurrency,
        buyAmount,
        sellAmount,
      }))

      localStorage.setItem('mySwaps', JSON.stringify(swaps))
    }
    else {
      events.dispatch('new swap', swap)
    }
  }
}


export default new SwapCollection()

export {
  SwapCollection,
}
