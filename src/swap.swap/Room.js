import SwapApp from 'swap.app'


class Room {

  // TODO add destroy method with all events unsubscribe (when swap is finished)

  constructor({ swapId, participantPeer }) {
    this.swapId = swapId
    this.peer = participantPeer
  }

  on(eventName, handler) {
    SwapApp.services.room.on(eventName, ({ fromPeer, swapId, ...values }) => {
      console.log(`on ${eventName} from ${fromPeer} at swap ${swapId}?=${this.swapId}`, values)
      if (fromPeer === this.peer && swapId === this.swapId) {
        handler(values)
      }
    })
  }

  once(eventName, handler) {
    const self = this

    SwapApp.services.room.on(eventName, function ({ fromPeer, swapId, ...values }) {
      console.log(`once ${eventName} from ${fromPeer} at swap ${swapId}?=${self.swapId}`, values)
      if (fromPeer === self.peer && swapId === self.swapId) {
        this.unsubscribe()
        handler(values)
      }
    })
  }

  sendMessage(...args) {
    console.log(`send message`, args)
    if (args.length === 1) {
      const [ value ] = args

      // value - eventName
      if (typeof value === 'string') {
        SwapApp.services.room.sendMessage(this.peer, [
          {
            event: value,
            data: {
              swapId: this.swapId,
            }
          },
        ])
      }
      // value - messages
      else if (Array.isArray(value)) {
        SwapApp.services.room.sendMessage(this.peer, value)
      }
    }
    else {
      const [ eventName, message ] = args

      SwapApp.services.room.sendMessage(this.peer, [
        {
          event: eventName,
          data: {
            swapId: this.swapId,
            ...message,
          },
        },
      ])
    }
  }
}


export default Room
