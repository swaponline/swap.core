import React from 'react'
import ReactDOM from 'react-dom'
import SwapApp from 'swap.app'
import App from './App/App'
import './swapApp'


ReactDOM.render(<div>loading...</div>, document.getElementById('root'))

SwapApp.services.room.once('ready', () => {
  ReactDOM.render(<App />, document.getElementById('root'))
})
