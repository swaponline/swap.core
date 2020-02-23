import { NATIVE, ETH_TOKENS } from './COINS'

export default [
  'ETH-BTC',
  'EOS-BTC',
  'LTC-BTC',
  'ETH-BCH',
  'ETH-LTC',
  'SUM-LTC',
  'BTC-SUM',
  'SUM-BTC',
  'SUM-ETH',
  'QTUM-BTC',
  

  ...Object.values(ETH_TOKENS).map(token => `${token}-BTC`),
  // ...Object.values(ETH_TOKENS).map(token => `${token}-USDT`),
]
