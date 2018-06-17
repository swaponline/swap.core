import React, { Component } from 'react'
import SwapApp from 'swap.app'

import BtcToEth from './BtcToEth'
import EthToBtc from './EthToBtc'
import EthTokenToBtc from './EthTokenToBtc'
import BtcToEthToken from './BtcToEthToken'


const swapComponents = {
  'btceth': BtcToEth,
  'ethbtc': EthToBtc,
  'ethtokenbtc': EthTokenToBtc,
  'btcethtoken': BtcToEthToken,
}

export default class Swap extends Component {

  render() {
    const { orderId } = this.props

    if (!orderId) {
      return null
    }

    const { isMy: isMyOrder, buyCurrency, sellCurrency } = SwapApp.services.orders.getByKey(orderId)

    // TODO dynamically resolve Swap component to use
    const firstPart     = isMyOrder ? sellCurrency : buyCurrency
    const lastPart      = isMyOrder ? buyCurrency : sellCurrency
    const SwapComponent = swapComponents[`${firstPart.toLowerCase()}${lastPart.toLowerCase()}`]

    return (
      <div style={{ paddingLeft: '30px', paddingBottom: '100px' }}>
        <SwapComponent orderId={orderId} />
      </div>
    )
  }
}
