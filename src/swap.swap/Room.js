import SwapApp, { Events } from 'swap.app'


class Room {

  // TODO add destroy method with all events unsubscribe (when swap is finished)

  constructor({ swapId, participantPeer }) {
    this.swapId           = swapId
    this.peer  = participantPeer
    this._events          = new Events()
  }


  getOnlineParticipant =  () => {
    const online = SwapApp.services.room.connection.hasPeer(this.peer)

    if (!online) {
      this._events.dispatch('participant is offline', this.peer)
    }

    return online
  }

  on(eventName, handler) {
    SwapApp.services.room.on(eventName, ({ fromPeer, swapId, ...values }) => {
      console.log(`on ${eventName} from ${fromPeer} at swap ${swapId}`)
      if (fromPeer === this.peer && swapId === this.swapId) {
        handler(values)
      }
    })
  }

  once(eventName, handler) {
    const self = this

    SwapApp.services.room.on(eventName, function ({ fromPeer, swapId, ...values }) {
      console.log(`once ${eventName} from ${fromPeer} at swap ${swapId}`)
      if (fromPeer === self.peer && swapId === self.swapId) {
        this.unsubscribe()
        handler(values)
      }
    })
  }

  sendMessage(message) {
    if (!this.getOnlineParticipant()) {
      setTimeout(() => {
        this.sendMessage(message)
      }, 3000)
    }

    const { event, data } = message

    SwapApp.services.room.sendConfirmation(this.peer, {
      event,
      action: 'active',
      data: {
        swapId: this.swapId,
        ...data,
      },
    })
  }
}


export default Room
