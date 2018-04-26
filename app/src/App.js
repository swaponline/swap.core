import React, { Fragment, Component } from 'react'
import { app } from './swap'


export default class App extends Component {

  constructor() {
    super()

    this.state = {
      myPeer: app.storage.me.peer,
      swaps: app.swapCollection.items,
    }
  }

  componentWillMount() {
    app.on('new swaps', this.updateSwaps)
    app.on('new swap', this.updateSwaps)
    app.on('remove swap', this.updateSwaps)
    app.on('swap update', this.updateSwaps)
    app.on('new swap request', this.handleRequest)
  }

  componentWillUnmount() {
    app.off('new swaps', this.updateSwaps)
    app.off('new swap', this.updateSwaps)
    app.off('remove swap', this.updateSwaps)
    app.off('swap update', this.updateSwaps)
    app.off('new swap request', this.handleRequest)
  }

  updateSwaps = () => {
    this.setState({
      swaps: app.swapCollection.items,
    })
  }

  handleRequest = ({ swapId, participant }) => {
    this.updateSwaps()
  }

  createSwap = () => {
    const data = {
      buyCurrency: 'ETH',
      sellCurrency: 'BTC',
      buyAmount: 1,
      sellAmount: 0.1,
    }

    app.createSwap(data)
    this.updateSwaps()
  }

  removeSwap = (swapId) => {
    app.removeSwap(swapId)
    this.updateSwaps()
  }

  requestSwap = (swapId) => {
    const swap = app.swapCollection.getByKey(swapId)

    swap.sendRequest((isAccepted) => {
      console.log(`user ${swap.owner.peer} ${isAccepted ? 'accepted' : 'declined'} your request`)
    })
    this.updateSwaps()
  }

  acceptRequest = (swapId, participantPeer) => {
    const swap = app.swapCollection.getByKey(swapId)

    swap.acceptRequest(participantPeer)
    this.updateSwaps()
  }

  declineRequest = (swapId, participantPeer) => {
    const swap = app.swapCollection.getByKey(swapId)

    swap.declineRequest(participantPeer)
    this.updateSwaps()
  }

  render() {
    const { myPeer, swaps } = this.state

    return (
      <div>
        <button onClick={this.createSwap}>Create Swap</button>
        <br /><br />

        {
          Boolean(swaps && swaps.length) && (
            <div className="swaps">
              <table>
                <thead>
                  <tr>
                    <th>Exchange Rate</th>
                    <th>User Reputation</th>
                    <th>{swaps[0].buyCurrency.toUpperCase()}</th>
                    <th>{swaps[0].sellCurrency.toUpperCase()}</th>
                    <th width="1%" colSpan="2" />
                  </tr>
                </thead>
                <tbody>
                  {
                    swaps.map((swap) => {
                      const {
                        id, buyAmount, sellAmount, exchangeRate, requests, requesting,
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
                                      <button onClick={() => this.removeSwap(id)}>REMOVE</button>
                                    )
                                  }
                                </Fragment>
                              ) : (
                                <Fragment>
                                  {
                                    requesting ? (
                                      <div style={{ color: 'red' }}>REQUESTING</div>
                                    ) : (
                                      <button onClick={() => this.requestSwap(id)}>BUY</button>
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
            </div>
          )
        }
      </div>
    )
  }
}
