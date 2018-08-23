import bitcoin from 'bitcoinjs-lib'

const mockSwapApp = {
  env: {
    bitcoin,
  }
}

const SwapInterface = function () {

}

const constants = {
  COINS: { btc: 'BTC' }
}

export default mockSwapApp
export { SwapInterface, constants }
