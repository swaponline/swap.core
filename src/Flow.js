import Events from './Events'
import Storage, { storage } from './Storage'
import room from './room'


class Flow {

  /*

    Flow storage data:

    {boolean} isWaitingParticipant
    {string}  signTransactionUrl
    {boolean} isSignFetching
    {boolean} isMeSigned
    {boolean} isParticipantSigned

   */

  constructor({ swap, options: { ethSwap } }) {
    this.events   = new Events()
    this.storage  = new Storage({
      storeKey: `flow.${swap.id}`,
      data: {
        step: 0,
      },
    })

    this.ethSwap  = ethSwap
    this.swap     = swap
    this.steps    = null
    this.index    = 0
  }

  _persist() {
    this.steps = [
      ...this._getInitialSteps(),
      ...this._getSteps(),
    ]

    this.goStep(this.storage.step)
  }

  _getInitialSteps() {
    const flow = this

    return [

      // Check if order exists

      async () => {
        const { id: orderId, owner } = this.swap

        if (!owner) {
          flow.storage.update({
            isWaitingParticipant: true, // this means that participant with such order is offline
          })

          room.subscribe('new orders', function ({ orders }) {
            const order = orders.find(({ id }) => id === orderId)

            if (order) {
              this.unsubscribe()

              const order = orders.getByKey(orderId)

              flow.swap.update(order)
              flow.finishStep()
            }
          })
        }
        else {
          flow.finishStep()
        }
      },

      // Setup data

      () => {
        const { id, isMy, participant } = this.swap

        if (!isMy) {
          this.swap.update({
            participant: this.swap.owner,
          })

          flow.storage.update({
            waitingParticipantToConnect: true,
          })

          room.subscribe('swap:userConnected', function ({ orderId, participant }) {
            if (id === orderId) {
              this.unsubscribe()

              flow.storage.update({
                participant,
              })
              flow.finishStep()
            }
          })
        }

        room.sendMessage(participant.peer, [
          {
            event: 'swap:userConnected',
            data: {
              orderId: id,
              participant: storage.me,
            },
          },
        ])

        if (isMy) {
          flow.finishStep()
        }
      },

      // Signs

      () => {
        const { id } = this.swap

        room.subscribe('swap:signed', function ({ orderId }) {
          if (id === orderId) {
            this.unsubscribe()

            flow.finishStep({
              isParticipantSigned: true,
            })

            const { isMeSigned, isParticipantSigned } = flow.storage

            if (isMeSigned && isParticipantSigned) {
              flow.finishStep()
            }
          }
        })
      },
    ]
  }

  _getSteps() {
    return []
  }

  finishStep(data = {}) {
    this.goNextStep(data)
  }

  goNextStep(data) {
    this.goStep(++this.index, data)
  }

  goStep(index, data) {
    this.index = index
    const prevIndex = index - 1

    if (prevIndex >= 0) {
      this.events.dispatch('leaveStep', prevIndex)
    }

    if (data) {
      this.storage.update({
        step: this.index + 1,
        ...data,
      })
    }

    this.events.dispatch('enterStep', this.index)
    this.steps[this.index]({ index: this.index })
  }

  on(eventName, handler) {
    this.events.subscribe(eventName, handler)
  }


  // TODO need to move sign functionality from Flow class coz in other swaps this process could be necessary

  async sign() {
    const { id, participant } = this.swap

    this.storage.update({
      isSignFetching: true,
    })

    await this.ethSwap.sign(
      {
        myAddress: storage.me.ethData.address,
        participantAddress: participant.eth.address,
      },
      (signTransactionUrl) => {
        this.storage.update({
          signTransactionUrl,
        })
      }
    )

    this.storage.update({
      isSignFetching: false,
      isMeSigned: true,
    })

    room.sendMessage(participant.peer, [
      {
        event: 'swap:signed',
        data: {
          orderId: id,
        },
      },
    ])

    const { isMeSigned, isParticipantSigned } = this.storage

    if (isMeSigned && isParticipantSigned) {
      this.finishStep()
    }
  }
}


export default Flow
