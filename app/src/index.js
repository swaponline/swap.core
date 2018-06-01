import React from 'react'
import ReactDOM from 'react-dom'

import App from './App/App'
import swapApp from './swapApp'


ReactDOM.render(<div>loading...</div>, document.getElementById('root'))

swapApp.room.once('ready', () => {
  ReactDOM.render(<App />, document.getElementById('root'))
})
