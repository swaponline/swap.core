const localStorage = {
  getItem: () => {},
  setItem: () => {},
}

const room = {
  connection: {
    on: () => {},
  },
}


import Swap from './Swap'
import { eth2btc } from './flows'


const swap = new Swap({
  // initial state to load saved data - to persist current step, etc
  initialState: localStorage.getItem('swap'),
  // pass room connection to subscribe and dispatch events
  connection: room.connection,
  // setup steps flow
  flow: eth2btc,
})

swap.storage.on('update', (values) => {
  console.log('update values', values)
  localStorage.setItem('swap', values)
})

swap.flow.on('leaveStep', (index) => {
  console.log('leave step', index)
})

swap.flow.on('enterStep', (index) => {
  console.log('enter step', index)
})


swap.flow.goNextStep()
