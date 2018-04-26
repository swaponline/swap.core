import React, { Component } from 'react'
import { app } from '../swap'

import Swaps from './Swaps/Swaps'
import Swap from './Swap/Swap'


export default class App extends Component {

  static defaultProps = {
    myPeer: app.storage.me.peer,
  }

  render() {
    const { myPeer } = this.props

    return (
      <div className="content">
        <Swaps myPeer={myPeer} />
        <Swap />
      </div>
    )
  }
}
