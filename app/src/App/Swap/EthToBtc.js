import React, { Component, Fragment } from 'react'
import { web3, bitcoin } from '../../swap'
import { EthSwap, BtcSwap } from '../../swap/swaps'
import { ETH2BTC } from '../../swap/flows'
import { request } from '../../util'


export default class EthToBtc extends Component {

  state = {
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
      lib: bitcoin,
      account: {},
      address: '0x0',
      keyPair: {},
      fetchUnspents: (address) => request.get(`https://test-insight.bitpay.com/api/addr/${address}/utxo`),
    })

    const getBalance = () => {
      // TODO resolve balance from crypto instances
      return 100
    }

    const flow = swap.setFlow(ETH2BTC, {
      ethSwap,
      btcSwap,
      getBalance,
    })

    this.state.flow = flow.storage

    // swap.storage.on('update', this.handleStorageUpdate)
    swap.flow.storage.on('update', this.handleFlowStorageUpdate)
    swap.flow.on('leave step', this.handleLeaveStep)
    swap.flow.on('enter step', this.handleEnterStep)
  }

  componentWillUnmount() {
    const { swap } = this.props

    // swap.storage.off('update', this.handleStorageUpdate)
    swap.flow.storage.off('update', this.handleFlowStorageUpdate)
    swap.flow.off('leave step', this.handleLeaveStep)
    swap.flow.off('enter step', this.handleEnterStep)
  }

  // handleStorageUpdate = (values) => {
  //   console.log('new order storage values', values)
  //
  //   this.setState({
  //     swap: values,
  //   })
  // }

  handleFlowStorageUpdate = (values) => {
    console.log('new flow storage values', values)

    this.setState({
      flow: values,
    })
  }

  handleLeaveStep = (index) => {
    console.log('leave step', index)
  }

  handleEnterStep = (index) => {
    console.log('\n-----------------------------\n\n')
    console.log('enter step', index)
  }

  signSwap = () => {
    const { swap } = this.props

    swap.flow.sign()
  }

  confirmBTCScriptChecked = () => {

  }

  updateBalance = () => {

  }

  render() {
    const { flow } = this.state
    const { swap } = this.props

    console.log('EthToBtc flow:', flow)

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
                <div>Loading...</div>
              </Fragment>
            )
          )
        }

        {
          flow.isWaitingForOwner && (
            <Fragment>
              <h3>Waiting for other user when he connect to the order</h3>
              <div>Loading...</div>
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
                flow.isSignFetching && (
                  <Fragment>
                    <h5>Please wait. Confirmation processing</h5>
                    {
                      flow.signTransactionUrl && (
                        <div>
                          Transaction:
                          <strong>
                            <a
                              href={flow.signTransactionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {flow.signTransactionUrl}
                            </a>
                          </strong>
                        </div>
                      )
                    }
                    <div>Loading...</div>
                  </Fragment>
                )
              }
              {
                flow.isMeSigned && (
                  <h4>You successfully confirmed your participation</h4>
                )
              }
              {
                flow.isMeSigned && !flow.isParticipantSigned && (
                  <Fragment>
                    <h5>Waiting when other user confirm his participation</h5>
                    <div>Loading...</div>
                  </Fragment>
                )
              }
            </Fragment>
          )
        }

        {/* -------------------------------------------------------------- */}

        {
          flow.isMeSigned && flow.isParticipantSigned && (
            <Fragment>
              <h3>2. Waiting BTC Owner creates Secret Key, creates BTC Script and charges it</h3>

              {
                flow.secretHash && flow.btcScriptData && (
                  <Fragment>
                    <h3>3. Bitcoin Script created and charged. Please check the information below</h3>
                    <div>Secret Hash: <strong>{flow.secretHash}</strong></div>
                    <div>
                      Script address:
                      <strong>
                        <a
                          href={`https://www.blocktrail.com/tBTC/address/${flow.btcScriptData.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {flow.btcScriptData.address}
                          </a>
                      </strong>
                    </div>
                    <pre>
                      <code>
  bitcoinjs.script.compile([
    bitcoin.core.opcodes.OP_RIPEMD160,
    Buffer.from('{flow.btcScriptData.secretHash}', 'hex'),
    bitcoin.core.opcodes.OP_EQUALVERIFY,

    Buffer.from('{flow.btcScriptData.ethOwnerPublicKey}', 'hex'),
    bitcoin.core.opcodes.OP_EQUAL,
    bitcoin.core.opcodes.OP_IF,

    Buffer.from('{flow.btcScriptData.ethOwnerPublicKey}', 'hex'),
    bitcoin.core.opcodes.OP_CHECKSIG,

    bitcoin.core.opcodes.OP_ELSE,

    bitcoin.core.script.number.encode({flow.btcScriptData.lockTime}),
    bitcoin.core.opcodes.OP_CHECKLOCKTIMEVERIFY,
    bitcoin.core.opcodes.OP_DROP,
    Buffer.from('{flow.btcScriptData.btcOwnerPublicKey}', 'hex'),
    bitcoin.core.opcodes.OP_CHECKSIG,

    bitcoin.core.opcodes.OP_ENDIF,
  ])
                      </code>
                    </pre>
                    {
                      flow.step === 1 && (
                        <button onClick={this.confirmBTCScriptChecked}>Everything is OK. Continue</button>
                      )
                    }
                  </Fragment>
                )
              }

              {
                flow.step === 2 && flow.notEnoughMoney && !flow.checkingBalance && (
                  <Fragment>
                    <h3>Not enough money for this swap. Please fund the balance</h3>
                    <div>
                      <div>Your balance: <strong>{flow.balance}</strong> ETH</div>
                      <div>Required balance: <strong>{flow.requiredAmount}</strong> {flow.requiredCurrency}</div>
                      <hr />
                      <span>{flow.address}</span>
                    </div>
                    <br />
                    <button type="button" onClick={this.updateBalance}>Continue</button>
                  </Fragment>
                )
              }
              {
                flow.step === 2 && flow.checkingBalance && (
                  <div>Checking balance..</div>
                )
              }

              {
                (flow.step === 3 || flow.isEthSwapCreated) && (
                  <h3>4. Creating Ethereum Contract. Please wait, it will take a while</h3>
                )
              }
              {
                flow.step === 3 && flow.ethSwapCreationTransactionUrl && (
                  <div>
                    Transaction:
                    <strong>
                      <a
                        href={flow.ethSwapCreationTransactionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {flow.ethSwapCreationTransactionUrl}
                      </a>
                    </strong>
                  </div>
                )
              }

              {
                (flow.step === 4 || flow.isEthWithdrawn) && (
                  <h3>5. Waiting BTC Owner adds Secret Key to ETH Contact</h3>
                )
              }

              {
                (flow.step === 5 || flow.isWithdrawn) && (
                  <h3>6. BTC Owner successfully took money from ETH Contract and left Secret Key. Requesting withdrawal from BTC Script. Please wait</h3>
                )
              }
              {
                flow.step === 5 && flow.btcSwapWithdrawTransactionUrl && (
                  <div>
                    Transaction:
                    <strong>
                      <a
                        href="https://www.blocktrail.com/tBTC/tx/{flow.btcSwapWithdrawTransactionUrl}"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {flow.btcSwapWithdrawTransactionUrl}
                      </a>
                    </strong>
                  </div>
                )
              }

              {
                flow.isWithdrawn && (
                  <Fragment>
                    <h3>7. Money was transferred to your wallet. Check the balance.</h3>
                    <h2>Thank you for using Swap.Online!</h2>
                  </Fragment>
                )
              }

              {
                (!flow.secretHash || !flow.btcScriptData) && flow.step !== 6 && (
                  <div>loading...</div>
                )
              }
            </Fragment>
          )
        }
      </div>
    )
  }
}
