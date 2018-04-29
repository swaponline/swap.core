import React, { Component } from 'react'
import { app } from '../../swap'

import BtcToEth from './BtcToEth'
import EthToBtc from './EthToBtc'


const swapComponents = {
  'btceth': BtcToEth,
  'ethbtc': EthToBtc,
}

export default class Swap extends Component {

  state = {
    swap: null,
  }
  
  componentWillReceiveProps({ orderId }) {
    const { swap } = this.state
    
    if (!swap && orderId) {
      const swap = app.createSwap({ orderId })
      
      this.setState({
        swap,
      })
    }
  }

  render() {
    const { swap } = this.state

    if (!swap) {
      return null
    }

    console.log(333, swap)

    const { isMy: isMyOrder, buyCurrency, sellCurrency } = swap

    // TODO dynamically resolve Swap component to use
    const firstPart     = isMyOrder ? buyCurrency : sellCurrency
    const lastPart      = isMyOrder ? sellCurrency : buyCurrency
    const SwapComponent = swapComponents[`${firstPart.toLowerCase()}${lastPart.toLowerCase()}`]

    return (
      <SwapComponent swap={swap} />
    )
  }
}
