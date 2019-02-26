/**
 * @param {function} action
 * @param {number} delay
 * @returns {Promise<any>}
 */
const repeatAsyncUntilResult = (action, delay = 5 * 1000) =>
  new Promise(async (resolve) => {
    let isStoped = false
    const stop = () => {
      isStoped = true
    }
    const iteration = async () => {
      const result = await action(stop)

      if (!isStoped && (!result
        || result === 0
        || typeof result === 'undefined'
        || result === null
        || result === '0x0000000000000000000000000000000000000000')
      ) {
        setTimeout(iteration, delay)
      } else {
        resolve(result)
      }
    }

    iteration()
  })

export default {
  repeatAsyncUntilResult,
}
