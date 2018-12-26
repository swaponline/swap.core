import SwapApp from 'swap.app'
import Room from './Room'


class Flow {

  constructor(swap) {
    this.swap     = swap
    this.steps    = []

    this.stepNumbers = {}

    this.state = {
      step: 0,
      isWaitingForOwner: false,
    }
  }

  _persistState() {
    const state = SwapApp.env.storage.getItem(`flow.${this.swap.id}`)

    if (state) {
      this.state = {
        ...this.state,
        ...state,
      }
    }

    this.swap.room.on('persist state', (values) => {
      this.setState(values, true)
    })
  }

  _persistSteps() {
    this.steps = [
      ...this._getInitialSteps(),
      ...this._getSteps(),
    ]

    // wait events placed
    setTimeout(() => {
      if (this.state.step >= this.steps.length)
        return
      else this.goStep(this.state.step)
    }, 0)
  }

  _getInitialSteps() {
    const flow = this

    return [

      // Check if order exists

      async () => {
        const { id: orderId, owner } = this.swap

        // TODO how can we don't know who is participant???
        // TODO if there is no participant in `order` then no need to create Flow...
        // if there is no order it orderCollection that means owner is offline, so `swap.owner` will be undefined
        if (!owner) {
          flow.setState({
            isWaitingForOwner: true,
          })

          SwapApp.services.room.on('new orders', function ({ orders }) {
            const order = orders.find(({ id }) => id === orderId)

            if (order) {
              this.unsubscribe()

              const order = orders.getByKey(orderId)

              // TODO move this to Swap.js
              flow.swap.room = new Room({
                participantPeer: order.owner.peer,
              })
              flow.swap.update({
                ...order,
                participant: order.owner,
              })
              flow.finishStep({
                isWaitingForOwner: false,
              })
            }
          })
        }
        else {
          flow.finishStep()
        }
      },
    ]
  }

  _getSteps() {
    return []
  }

  _saveState() {
    SwapApp.env.storage.setItem(`flow.${this.swap.id}`, this.state)
  }
  finishStep(data, constraints) {
    console.log(`on step ${this.state.step}, constraints =`, constraints)

    if (constraints) {
      const { step, silentError } = constraints

      const n_step = this.stepNumbers[step]
      console.log(`trying to finish step ${step} = ${n_step} when on step ${this.state.step}`)

      if (step && this.state.step != n_step) {
        if (silentError) {
          console.error(`Cant finish step ${step} = ${n_step} when on step ${this.state.step}`)
          return
        } else {
          throw new Error(`Cant finish step ${step} = ${n_step} when on step ${this.state.step}`)
          return
        }
      }
    }

    console.log(`proceed to step ${this.state.step+1}, data=`, data)

    this.goNextStep(data)
  }

  goNextStep(data) {
    const { step } = this.state
    const newStep = step + 1

    this.swap.events.dispatch('leave step', step)

    this.setState({
      step: newStep,
      ...(data || {}),
    }, true)

    if (this.steps.length > newStep)
      this.goStep(newStep)
  }

  goStep(index) {
    this.swap.events.dispatch('enter step', index)
    this.steps[index]()
  }

  setState(values, save) {
    this.state = {
      ...this.state,
      ...values,
    }

    if (save) {
      this._saveState()
    }

    this.swap.events.dispatch('state update', this.state, values)
  }
}


export default Flow
