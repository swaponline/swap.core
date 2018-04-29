import React, { Fragment, Component } from 'react'
import { app } from '../../swap'


export default class Orders extends Component {

  constructor() {
    super()

    this.state = {
      orders: app.orderCollection.items,
    }
  }

  componentWillMount() {
    app.on('new orders', this.updateOrders)
    app.on('new order', this.updateOrders)
    app.on('remove order', this.updateOrders)
    app.on('swap update', this.updateOrders)
    app.on('new order request', this.handleRequest)
    app.on('accept swap request', this.handleAcceptRequest)
    app.on('decline swap request', this.handleDeclineRequest)
  }

  componentWillUnmount() {
    app.off('new orders', this.updateOrders)
    app.off('new order', this.updateOrders)
    app.off('remove order', this.updateOrders)
    app.off('swap update', this.updateOrders)
    app.off('new order request', this.handleRequest)
    app.off('accept swap request', this.handleAcceptRequest)
    app.off('decline swap request', this.handleDeclineRequest)
  }

  updateOrders = () => {
    this.setState({
      orders: app.orderCollection.items,
    })
  }

  handleRequest = ({ swapId, participant }) => {
    this.updateOrders()
  }

  handleAcceptRequest = ({ swapId, participant }) => {
    this.updateOrders()
    this.handleOrderSelect(swapId)
  }

  handleDeclineRequest = ({ swapId, participant }) => {
    this.updateOrders()
  }

  createOrder = () => {
    const data = {
      buyCurrency: 'ETH',
      sellCurrency: 'BTC',
      buyAmount: 1,
      sellAmount: 0.1,
    }

    app.createOrder(data)
    this.updateOrders()
  }

  removeOrder = (swapId) => {
    app.removeOrder(swapId)
    this.updateOrders()
  }

  requestOrder = (swapId) => {
    const swap = app.orderCollection.getByKey(swapId)

    swap.sendRequest((isAccepted) => {
      console.log(`user ${swap.owner.peer} ${isAccepted ? 'accepted' : 'declined'} your request`)
    })
    this.updateOrders()
  }

  acceptRequest = (swapId, participantPeer) => {
    const swap = app.orderCollection.getByKey(swapId)

    swap.acceptRequest(participantPeer)
    this.handleOrderSelect(swapId)
    this.updateOrders()
  }

  declineRequest = (swapId, participantPeer) => {
    const swap = app.orderCollection.getByKey(swapId)

    swap.declineRequest(participantPeer)
    this.updateOrders()
  }

  handleOrderSelect = (swapId) => {
    const { onOrderSelect } = this.props

    onOrderSelect(swapId)
  }

  render() {
    const { orders } = this.state
    const { myPeer } = this.props

    return (
      <div>
        <button onClick={this.createOrder}>Create Order</button>
        <br /><br />
        {
          Boolean(orders && orders.length) && (
            <table>
              <thead>
                <tr>
                  <th>Exchange Rate</th>
                  <th>User Reputation</th>
                  <th>{orders[0].buyCurrency.toUpperCase()}</th>
                  <th>{orders[0].sellCurrency.toUpperCase()}</th>
                  <th width="1%" colSpan="2" />
                </tr>
              </thead>
              <tbody>
                {
                  orders.map((swap) => {
                    const {
                      id, buyAmount, sellAmount, exchangeRate, requests, isRequested,
                      owner: { peer: ownerPeer, reputation },
                    } = swap

                    return (
                      <tr key={id}>
                        <td>{exchangeRate}</td>
                        <td>{reputation}</td>
                        <td>{sellAmount}</td>
                        <td>{buyAmount}</td>
                        <td>
                          {
                            myPeer === ownerPeer ? (
                              <Fragment>
                                {
                                  Boolean(requests && requests.length) ? (
                                    <Fragment>
                                      {
                                        requests.map(({ peer, reputation }) => (
                                          <div key={peer}>
                                            User {peer} with <b>{reputation}</b> reputation wants to swap.
                                            <button onClick={() => this.acceptRequest(id, peer)}>ACCEPT</button>
                                            <button onClick={() => this.declineRequest(id, peer)}>DECLINE</button>
                                          </div>
                                        ))
                                      }
                                    </Fragment>
                                  ) : (
                                    <button onClick={() => this.removeOrder(id)}>REMOVE</button>
                                  )
                                }
                              </Fragment>
                            ) : (
                              <Fragment>
                                {
                                  isRequested ? (
                                    <div style={{ color: 'red' }}>REQUESTING</div>
                                  ) : (
                                    <button onClick={() => this.requestOrder(id)}>BUY</button>
                                  )
                                }
                              </Fragment>
                            )
                          }
                        </td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
          )
        }
      </div>
    )
  }
}
