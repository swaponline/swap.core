export const NATIVE = {
  eth: 'ETH',
  btc: 'BTC',
  sum: 'SUM',
  ghost: 'GHOST',
  next: 'NEXT'
}

export const ETH_TOKENS = {
  noxon: 'NOXON',
  swap: 'SWAP',
  pbl: 'PBL',
  xsat: 'XSAT',
  hdp: 'HDP',
  scro: 'SCRO',
  xeur: 'XEUR',
  eurs: 'EURS',
  usdt: 'USDT',
  snm: 'SNM',
}

export default {
  ...NATIVE,
  ...ETH_TOKENS,
}



export const COIN_TYPE = Object.freeze({
  'NATIVE': 'NATIVE',
  'ETH_TOKEN': 'ETH_TOKEN',
})

export default COIN_MODEL = Object.freeze({
  UTXO: 'UTXO', // Unspent Transaction Outputs model
  AB: 'AB' // Account/Balance model
})

export const COINS = {
  'BTC': {
    ticker: 'BTC',
    name: 'Bitcoin',
    type: COIN_TYPE.NATIVE,
    model: COIN_MODEL.UTXO,
    precision: 8,
  },
  'ETH': {
    ticker: 'ETH',
    name: 'Ethereum',
    type: COIN_TYPE.NATIVE,
    model: COIN_MODEL.AB,
    precision: 18,
  },
  'USDT': {
    ticker: 'USDT',
    name: 'Tether',
    type: COIN_TYPE.ETH_TOKEN,
    model: COIN_MODEL.AB,
    precision: 18,
  },
  'SUM': {
    ticker: 'SUM',
    name: 'Sumcoin',
    type: COIN_TYPE.NATIVE,
    model: COIN_MODEL.UTXO,
    precision: 8,
  },
  'GHOST': {
    ticker: 'GHOST',
    name: 'Ghost',
    type: COIN_TYPE.NATIVE,
    model: COIN_MODEL.UTXO,
    precision: 8,
  },
  'NEXT': {
    ticker: 'NEXT',
    name: 'NEXT.coin',
    type: COIN_TYPE.NATIVE,
    model: COIN_MODEL.UTXO,
    precision: 8,
  },
  'NOXON': {
    ticker: 'NOXON',
    name: 'NOXON',
    type: COIN_TYPE.ETH_TOKEN,
    model: COIN_MODEL.AB,
    precision: 18,
  },
  'SWAP': {
    ticker: 'SWAP',
    name: 'SWAP',
    type: COIN_TYPE.ETH_TOKEN,
    model: COIN_MODEL.AB,
    precision: 18,
  },
  'XEUR': {
    ticker: 'XEUR',
    name: 'xEURO',
    type: COIN_TYPE.ETH_TOKEN,
    model: COIN_MODEL.AB,
    precision: 18,
  },
  'EURS': {
    ticker: 'EURS',
    name: 'STASIS EURO',
    type: COIN_TYPE.ETH_TOKEN,
    model: COIN_MODEL.AB,
    precision: 18,
  },
  'SNM': {
    ticker: 'SONM',
    name: 'SWAP',
    type: COIN_TYPE.ETH_TOKEN,
    model: COIN_MODEL.AB,
    precision: 18,
  },
}
