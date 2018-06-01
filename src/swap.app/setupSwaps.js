import SwapCore from '../swap.core'


export default (swaps) => {
  const swapsMap = {}

  swaps.forEach((swap) => {
    if (!swap._name) {
      throw new Error('SwapApp swap should contain "_name" property')
    }

    if (SwapCore.constants.SWAP_NAMES.indexOf(swap._name) < 0) {
      const list  = JSON.stringify(SwapCore.constants.SWAP_NAMES).replace(/"/g, '\'')
      const error = `SwapApp.setupSwaps(): Only [${list}] available`

      throw new Error(error)
    }

    swapsMap[swap._name] = swap
  })

  return swapsMap
}
