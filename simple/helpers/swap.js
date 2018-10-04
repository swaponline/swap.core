import { constants } from 'swap.app'

import on from './on'

const onStep = (swap, _step) => new Promise(async resolve => {
  const step = await on(swap.flow, 'enter step')

  if (step === _step) resolve(step)
})

const start = async swap => {
  switch (swap.flow._flowName) {
    case "BTC2ETH":
      await onStep(swap, 1)
      swap.flow.sign()

      await onStep(swap, 3)
      swap.flow.submitSecret()
      break;
    case "ETH2BTC":
      await onStep(swap, 2)
      swap.flow.verifyBtcScript()
      break;
  }
}

module.exports = { onStep, start }
