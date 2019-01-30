import SwapApp from 'swap.app'

/**
 * @param {string} options.keyName
 */
const create = (app, keyName) => {
  SwapApp.required(app)

  const key = Date.now()

  app.env.sessionStorage.setItem(keyName, key)

  return key
}

/**
 * @param {string} options.keyName
 * @param {number} options.actualKey
 */
const compare = (app, keyName, actualKey) => {
  SwapApp.required(app)

  const oldKey = Number(app.env.sessionStorage.getItem(keyName))

  if (oldKey === 0) {
    throw new Error('Not found this keyName')
  }

  return oldKey === actualKey
}

/**
 * @param {string} options.keyName
 */
const remove = (app, keyName) => {
  SwapApp.required(app)

  app.env.sessionStorage.removeItem(keyName)
}

export default {
  create,
  compare,
  remove,
}
