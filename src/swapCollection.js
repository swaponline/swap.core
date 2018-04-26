import { events } from './Events'
import Collection from './Collection'
import Swap from './Swap'
import room from './room'


class SwapCollection extends Collection {

  constructor() {
    super()

    this._onMount()
  }

  _onMount() {
    this._persistMySwaps()

    room.subscribe('user online', (peer) => {
      const mySwaps = SwapCollection.getMySwaps()

      if (mySwaps.length) {
        console.log(`Send my orders to ${peer}`, mySwaps)

        room.sendMessage(peer, [
          {
            event: 'new swaps',
            data: {
              swaps: mySwaps,
            },
          },
        ])
      }
    })

    room.subscribe('new swaps', ({ swaps }) => {
      this.handleMultipleCreate(swaps)
    })

    room.subscribe('new swap', ({ swap: data }) => {
      this.handleCreate(data)
    })

    room.subscribe('remove swap', ({ swapId }) => {
      this.handleRemove(swapId)
    })
  }

  _persistMySwaps() {
    SwapCollection.getMySwaps().forEach((swapData) => {
      const swap = new Swap(swapData)

      this.append(swap, swap.id)
    })
  }

  _saveMySwaps() {
    // clean swaps from other additional props
    const swaps = this.items.map(({ id, owner, buyCurrency, sellCurrency, buyAmount, sellAmount }) => ({
      id,
      owner,
      buyCurrency,
      sellCurrency,
      buyAmount,
      sellAmount,
    }))

    global.localStorage.setItem('mySwaps', JSON.stringify(swaps))
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
   */
  create(data) {
    const swap = new Swap(data)

    this.append(swap, swap.id)
    room.sendMessage([
      {
        event: 'new swap',
        data: {
          swap,
        },
      },
    ])
    this._saveMySwaps()
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
  handleCreate(data) {
    const swap = new Swap(data)

    this.append(swap, swap.id)
    events.dispatch('new swap', swap)
  }

  handleMultipleCreate(swapsData) {
    const swaps = []

    swapsData.forEach((data) => {
      const swap = new Swap(data)

      swaps.push(swap)
      this.append(swap, swap.id)
    })

    events.dispatch('new swaps', swaps)
  }

  remove(id) {
    this.removeByKey(id)
    room.sendMessage([
      {
        event: 'remove swap',
        data: {
          swapId: id,
        },
      },
    ])
    this._saveMySwaps()
  }

  handleRemove(id) {
    const swap = this.getByKey(id)

    this.removeByKey(id)
    events.dispatch('remove swap', swap)
  }
}


export default new SwapCollection()

export {
  SwapCollection,
}
