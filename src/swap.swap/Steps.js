const UTXO_2_AB = AB_2_AB = (from, to) => ({
  `sign`: 1,
  `submit-secret`: 2,
  `sync-balance`: 3,
  `lock-${from}`: 4,
  `wait-lock-${to}`: 5,
  `withdraw-${to}`: 6,
  `finish`: 7,
  `end`: 8
})

const UTXO_2_UTXO = AB_2_UTXO = (from, to) => ({
  `sign`: 1,
  `wait-lock-${to}`: 2,
  `verify-script`: 3,
  `sync-balance`: 4,
  `lock-${from}`: 5,
  `wait-withdraw-${from}`: 6, // aka getSecret
  `withdraw-${to}`: 7,
  `finish`: 8,
  `end`: 9
})

const stepsFromDirection = {
  UTXO_2_AB,
  AB_2_AB,
  UTXO_2_UTXO,
  AB_2_UTXO
}

const getSteps = (fromCoin, toCoin) => {
  const direction = `${fromCoin.model}_2_${toCoin.model}`
  const form = fromCoin.ticker.toLowerCase()
  const to = toCoin.ticker.toLowerCase()
  const steps = stepsFromDirection(direction)(form, to)
  return steps
}

export default getSteps;