import swap from 'swap.core'

const saveToHistory = (_swap) => {
  const storage = swap.app.env.storage

  const history = storage.getItem('history') || []

  try {
    const id = _swap.id

    if (history.filter(_id => _id === id).length > 0) {
      return console.log(`swap already saved id = ${id}`)
    }

    const newHistory = [ ...history, id ]

    storage.setItem('history', newHistory)

    console.log(`saved swap = ${id}`)
  } catch (err) {
    console.error(err)
    console.error(`Cannot save swap.history, rewind back`)
  }
}

const removeFromHistory = (_swap) => {
  const storage = swap.app.env.storage

  const history = storage.getItem('history') || []

  try {
    const id = _swap.id

    if (history.filter(_id => _id === id).length == 0) {
      return console.log(`swap not saved id = ${id} cant remove`)
    }

    const newHistory = history.filter(_id => _id !== id)

    storage.setItem('history', newHistory)

    console.log(`remove swap = ${id}`)
  } catch (err) {
    console.error(err)
    console.error(`Cannot save swap.history, rewind back`)
  }
}

const getSwaps = () => {
  const storage = swap.app.env.storage

  const history = storage.getItem('history') || []

  console.log(`history = ${history}`)

  return history
}

const save = (swap) => saveToHistory(swap)
const remove = (swap) => removeFromHistory(swap)
const get = () => getSwaps()

const history = {
  save,
  get,
  remove,
}

export default history
