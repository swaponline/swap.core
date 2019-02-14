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

  const oldKey = app.env.sessionStorage.getItem(keyName)

  if (!oldKey) {
    console.warn('Not found this keyName')

    return null
  }

  return oldKey === String(actualKey)
}

/**
 * @param {string} options.keyName
 */
const remove = (app, keyName) => {
  SwapApp.required(app)

  app.env.sessionStorage.removeItem(keyName)
}

/**
 * @param {string} options.keyName
 */
const check = (app, keyName) => {
  SwapApp.required(app)

  const key = app.env.sessionStorage.getItem(keyName)

  if (!key) {
    return null
  }

  return key
}

export default {
  create,
  compare,
  remove,
  check,
}
