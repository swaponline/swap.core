import { events } from './Events'


class Storage {

  update(values) {
    Object.keys(values).forEach((key) => {
      this[key] = values[key]
    })

    events.dispatch('storage:newValues', values)
    events.dispatch('storage:update', this.data)
  }

  on(eventName, handler) {
    this.events.subscribe(eventName, handler)
  }
}

const storage = new Storage()


export default Storage

export {
  storage,
}
