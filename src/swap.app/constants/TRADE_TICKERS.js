import { NATIVE, ETH_TOKENS } from './COINS'

export default [
  'ETH-BTC',

  ...Object.values(ETH_TOKENS).map(token => `${token}-BTC`),
  // ...Object.values(ETH_TOKENS).map(token => `${token}-USDT`),
]
