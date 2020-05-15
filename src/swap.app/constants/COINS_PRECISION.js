import { ETH_TOKENS } from './COINS'

export const NATIVE_PRECISION = {
  BTC: 8,
  ETH: 18,
  SUM: 8,
  // USDT: 8,
}

export const ETH_TOKEN_PRECISION =
  Object.values(ETH_TOKENS).reduce((acc, token) => ({
    ...acc,
    [token]: 18,
  }), {})

export default {
  ...ETH_TOKEN_PRECISION,
  ...NATIVE_PRECISION,
}
