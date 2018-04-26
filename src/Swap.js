import { events } from './Events'
import { storage } from './Storage'
import room from './room'


const getUniqueId = (() => {
  let id = Date.now()

  return () => `${storage.me.peer}-${++id}`
})()

class Swap {

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
  constructor(data) {
    this.id           = data.id || getUniqueId()
    this.owner        = storage.me
    this.participant  = null
    this.requests     = [] // income requests
    this.requesting   = false // outcome request status
    this.processing   = false // if swap processing

    Object.keys(data).forEach((key) => {
      this[key] = data[key]
    })

    this._onMount()
  }

  _onMount() {

    // Someone wants to start swap with you
    room.subscribe('request swap', ({ swapId, participant }) => {
      if (swapId === this.id && !this.requests.find(({ peer }) => peer === participant.peer)) {
        this.requests.push(participant)

        events.dispatch('new swap request', {
          swapId,
          participant,
        })
      }
    })
  }

  update(values) {
    Object.keys(values).forEach((key) => {
      this[key] = values[key]
    })

    events.dispatch('swap update', this, values)
  }

  /**
   *
   * @param callback - awaiting for response - accept / decline
   */
  sendRequest(callback) {
    if (storage.me.peer === this.owner.peer) {
      console.warn('You are the owner of this Swap. You can\'t send request to yourself.')
      return
    }

    if (this.requesting) {
      console.warn('You have already requested this swap.')
      return
    }

    this.update({
      requesting: true,
    })

    room.sendMessage(this.owner.peer, [
      {
        event: 'request swap',
        data: {
          swapId: this.id,
          participant: storage.me,
        },
      },
    ])

    room.subscribe('accept swap request', ({ swapId }) => {
      if (swapId === this.id) {
        this.update({
          processing: true,
          requesting: false,
        })

        callback(true)
      }
    })

    room.subscribe('decline swap request', ({ swapId }) => {
      if (swapId === this.id) {
        this.update({
          requesting: false,
        })

        // TODO think about preventing user from sent requests every N seconds
        callback(false)
      }
    })
  }

  acceptRequest(participantPeer) {
    this.participant = this.requests.find(({ peer }) => peer === participantPeer)

    // TODO decline all other participants
    this.requests = []

    room.sendMessage(participantPeer, [
      {
        event: 'accept swap request',
        data: {
          swapId: this.id,
        },
      },
    ])
  }

  declineRequest(participantPeer) {
    let index

    this.requests.some(({ peer }, _index) => {
      if (peer === participantPeer) {
        index = _index
      }
      return index !== undefined
    })

    this.requests.splice(index, 1)

    room.sendMessage(participantPeer, [
      {
        event: 'decline swap request',
        data: {
          swapId: this.id,
        },
      },
    ])
  }
}


export default Swap
