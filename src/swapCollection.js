import { events } from './Events'
import Collection from './Collection'
import Swap from './Swap'
import room from './room'
import { pullProps } from './util'


class SwapCollection extends Collection {

  constructor() {
    super()

    this._onMount()
  }

  _onMount() {
    this._persistMySwaps()

    room.subscribe('user online', (peer) => {
      const mySwaps = this.getMySwaps()

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
    this.getMySwaps().forEach((swapData) => {
      this.handleCreate(swapData)
    })
  }

  _create(data) {
    const swap = new Swap({ collection: this, data })

    this.append(swap, swap.id)

    return swap
  }

  _saveMySwaps() {
    // clean swaps from other additional props
    const swaps = this.items.map((item) => pullProps(
      item,
      'id',
      'owner',
      'buyCurrency',
      'sellCurrency',
      'buyAmount',
      'sellAmount',
      'participant',
      'requesting',
      'processing',
    ))

    global.localStorage.setItem('mySwaps', JSON.stringify(swaps))
  }

  getMySwaps() {
    const mySwaps = global.localStorage.getItem('mySwaps')

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
    this._create(data)
    this._saveMySwaps()

    room.sendMessage([
      {
        event: 'new swap',
        data: {
          swap: data,
        },
      },
    ])
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
    const swap = this._create(data)
    events.dispatch('new swap', swap)
  }

  handleMultipleCreate(swapsData) {
    const swaps = []

    swapsData.forEach((data) => {
      const swap = this._create(data)
      swaps.push(swap)
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
