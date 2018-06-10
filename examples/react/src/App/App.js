import React, { Component } from 'react'
import SwapApp from '../../swap-core/swap.app'

import Orders from './Orders/Orders'
import Swap from './Swap/Swap'


export default class App extends Component {

  state = {
    activeOrderId: null,
  }

  handleSelectOrder = (orderId) => {
    this.setState({
      activeOrderId: orderId,
    })
  }

  render() {
    const { activeOrderId } = this.state
    const myPeer = SwapApp.services.room.peer

    return (
      <div className="content">
        <Orders
          myPeer={myPeer}
          activeOrderId={activeOrderId}
          onOrderSelect={this.handleSelectOrder}
        />
        <Swap orderId={activeOrderId} />
      </div>
    )
  }
}
