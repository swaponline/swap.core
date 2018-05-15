import React, { Component, Fragment } from 'react'
import { web3, bitcoinJsLib, btcAccount } from '../../swap'
import { bitcoinInstance } from '../../instances'
import { EthSwap, BtcSwap } from '../../swap/swaps'
import { BTC2ETH } from '../../swap/flows'
import Loader from '../Loader/Loader'


export default class BtcToEth extends Component {

  state = {
    secret: 'c0809ce9f484fdcdfb2d5aabd609768ce0374ee97a1a5618ce4cd3f16c00a078',
    flow: null,
  }

  componentWillMount() {
    // TODO this might be from url query
    const { swap } = this.props

    const ethSwap = new EthSwap({
      lib: web3,
      gasLimit: 40 * 1e5,
    })

    const btcSwap = new BtcSwap({
      lib: bitcoinJsLib,
      account: btcAccount,
      fetchUnspents: () => bitcoinInstance.fetchUnspents(btcAccount.getAddress()),
      broadcastTx: (txRaw) => bitcoinInstance.broadcastTx(txRaw),
    })

    const fetchBalance = () => bitcoinInstance.fetchBalance(btcAccount.getAddress())

    const flow = swap.setFlow(BTC2ETH, {
      ethSwap,
      btcSwap,
      fetchBalance,
    })

    this.state.flow = flow.state

    swap.flow.on('state update', this.handleFlowStateUpdate)
    swap.flow.on('leave step', this.handleLeaveStep)
    swap.flow.on('enter step', this.handleEnterStep)
  }

  componentWillUnmount() {
    const { swap } = this.props

    swap.flow.off('state update', this.handleFlowStateUpdate)
    swap.flow.off('leave step', this.handleLeaveStep)
    swap.flow.off('enter step', this.handleEnterStep)
  }

  handleFlowStateUpdate = (values) => {
    console.log('new flow state values', values)

    this.setState({
      flow: values,
    })

    localStorage.setItem('swap:eth2btc', values)
  }

  handleLeaveStep = (index) => {
    console.log('leave step', index)
  }

  handleEnterStep = (index) => {
    console.log('\n-----------------------------\n\n')
    console.log(`enter step ${index}\n\n`)

    this.setState({
      flowStep: index,
    })
  }

  signSwap = () => {
    const { swap } = this.props

    swap.flow.sign()
  }

  submitSecret = () => {
    const { secret } = this.state
    const { swap } = this.props

    swap.flow.submitSecret(secret)
  }

  updateBalance = () => {
    const { swap } = this.props

    swap.flow.syncBalance()
  }

  render() {
    const { secret, flow } = this.state
    const { swap } = this.props

    return (
      <div>
        {
          swap.id && (
            swap.isMy ? (
              <strong>{swap.sellAmount} {swap.sellCurrency} &#10230; {swap.buyAmount} {swap.buyCurrency}</strong>
            ) : (
              <strong>{swap.buyAmount} {swap.buyCurrency} &#10230; {swap.sellAmount} {swap.sellCurrency}</strong>
            )
          )
        }

        {
          !swap.id && (
            swap.isMy ? (
              <h3>This order doesn't have a buyer</h3>
            ) : (
              <Fragment>
                <h3>The order creator is offline. Waiting for him..</h3>
                <Loader />
              </Fragment>
            )
          )
        }
        
        {
          flow.isWaitingForOwner && (
            <Fragment>
              <h3>Waiting for other user when he connect to the order</h3>
              <Loader />
            </Fragment>
          )
        }
        
        {
          (flow.step === 1 || flow.isMeSigned) && (
            <h3>1. Please confirm your participation to begin the deal</h3>
          )
        }
        {
          flow.step === 1 && (
            <Fragment>
              <div>
                Confirmation of the transaction is necessary for crediting the reputation.
                If a user does not bring the deal to the end he gets a negative reputation.
              </div>
              {
                flow.isParticipantSigned && (
                  <h4>Other user confirmed his participation</h4>
                )
              }
              {
                !flow.isSignFetching && !flow.isMeSigned && (
                  <button onClick={this.signSwap}>Confirm</button>
                )
              }
              {
                (flow.isSignFetching || flow.signTransactionUrl) && (
                  <Fragment>
                    <h4>Please wait. Confirmation processing</h4>
                    {
                      flow.signTransactionUrl && (
                        <div>
                          Transaction:
                          <strong>
                            <a href={flow.signTransactionUrl} rel="noopener noreferrer" target="_blank">{flow.signTransactionUrl}</a>
                          </strong>
                        </div>
                      )
                    }
                    {
                      flow.isSignFetching && (
                        <Loader />
                      )
                    }
                  </Fragment>
                )
              }
              {
                flow.isMeSigned && (
                  <h4 style={{ color: 'green' }}>You successfully confirmed your participation</h4>
                )
              }
              {
                flow.isMeSigned && !flow.isParticipantSigned && (
                  <Fragment>
                    <h4 style={{ color: 'red' }}>Waiting when other user confirm his participation</h4>
                    <Loader />
                  </Fragment>
                )
              }
            </Fragment>
          )
        }

        {/* ----------------------------------------------------------- */}

        {
          flow.isMeSigned && flow.isParticipantSigned && (
            <Fragment>
              <h3>2. Create a secret key</h3>

              {
                !flow.secretHash ? (
                  <Fragment>
                    <input type="text" placeholder="Secret Key" defaultValue={secret} />
                    <br />
                    <button onClick={this.submitSecret}>Confirm</button>
                  </Fragment>
                ) : (
                  <Fragment>
                    <div>Save the secret key! Otherwise there will be a chance you loose your money!</div>
                    <div>Secret Key: <strong>{flow.secret}</strong></div>
                    <div>Secret Hash: <strong>{flow.secretHash}</strong></div>
                  </Fragment>
                )
              }

              {
                flow.step === 3 && !flow.isBalanceEnough && !flow.isBalanceFetching && (
                  <Fragment>
                    <h3>Not enough money for this swap. Please charge the balance</h3>
                    <div>
                      <div>Your balance: <strong>{flow.balance}</strong> {swap.sellCurrency}</div>
                      <div>Required balance: <strong>{swap.sellAmount}</strong> {swap.sellCurrency}</div>
                      <hr />
                      <span>{flow.address}</span>
                    </div>
                    <br />
                    <button type="button" onClick={this.updateBalance}>Continue</button>
                  </Fragment>
                )
              }
              {
                flow.step === 3 && flow.isBalanceFetching && (
                  <div>Checking balance..</div>
                )
              }

              {
                (flow.step === 4 || flow.btcScriptData) && (
                  <h3>3. Creating Bitcoin Script. Please wait, it will take a while</h3>
                )
              }

              {
                (flow.step === 5 || flow.isEthContractFunded) && (
                  <h3>5. ETH Owner received Bitcoin Script and Secret Hash. Waiting when he creates ETH Contract</h3>
                )
              }

              {
                (flow.step === 6 || flow.isEthWithdrawn) && (
                  <h3>6. ETH Contract created and charged. Requesting withdrawal from ETH Contract. Please wait</h3>
                )
              }
              {
                flow.ethSwapWithdrawTransactionUrl && (
                  <div>
                    Transaction:
                    <strong>
                      <a href={flow.ethSwapWithdrawTransactionUrl} target="_blank">{flow.ethSwapWithdrawTransactionUrl}</a>
                    </strong>
                  </div>
                )
              }

              {
                flow.isEthWithdrawn && (
                  <Fragment>
                    <h3>7. Money was transferred to your wallet. Check the balance.</h3>
                    <h2>Thank you for using Swap.Online!</h2>
                  </Fragment>
                )
              }

              {
                ((flow.step > 3 && flow.step !== 7) || flow.isBalanceFetching) && (
                  <Loader />
                )
              }
            </Fragment>
          )
        }
      </div>
    )
  }
}
