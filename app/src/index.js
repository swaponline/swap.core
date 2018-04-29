import React from 'react'
import ReactDOM from 'react-dom'
import App from './App/App'
import { app } from './swap'


ReactDOM.render(<div>loading...</div>, document.getElementById('root'))

app.on('ready', () => {
  ReactDOM.render(<App />, document.getElementById('root'))
})
