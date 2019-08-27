import debug from 'debug'
import crypto from 'bitcoinjs-lib/src/crypto'
import SwapApp, { constants, util } from 'swap.app'
import { Flow } from 'swap.swap'
import { BigNumber } from 'bignumber.js'


class BCH2ETH extends Flow {

  static getName() {
    return `${this.getFromName()}2${this.getToName()}`
  }
  static getFromName() {
    return constants.COINS.bch
  }
  static getToName() {
    return constants.COINS.eth
  }

  constructor(swap) {
    super(swap)

    this._flowName = BCH2ETH.getName()

    this.stepNumbers = {
      'sign': 1,
      'submit-secret': 2,
      'sync-balance': 3,
      'lock-bch': 4,
      'wait-lock-eth': 5,
      'withdraw-eth': 6,
      'finish': 7,
      'end': 8
    }

    this.ethSwap = swap.ownerSwap
    this.bchSwap = swap.participantSwap

    if (!this.ethSwap) {
      throw new Error('BCH2ETH: "ethSwap" of type object required')
    }
    if (!this.bchSwap) {
      throw new Error('BCH2ETH: "bchSwap" of type object required')
    }

    this.state = {
      step: 0,

      isStoppedSwap: false,
      isEnoughMoney: false,

      signTransactionHash: null,
      isSignFetching: false,
      isParticipantSigned: false,

      bchScriptCreatingTransactionHash: null,
      ethSwapCreationTransactionHash: null,

      secretHash: null,
      bchScriptValues: null,

      bchScriptVerified: false,

      createScriptFee: null,
      createScriptNeedAmount: null,
      isBalanceFetching: false,
      isBalanceEnough: false,
      balance: null,

      isEthContractFunded: false,

      bchSwapWithdrawTransactionHash: null,
      ethSwapWithdrawTransactionHash: null,

      canCreateEthTransaction: true,
      isEthWithdrawn: false,

      refundTransactionHash: null,
      isRefunded: false,
      withdrawFee: null,
      refundTxHex: null,
      isFinished: false,
      isSwapExist: false,
    }

    this.swap.room.once('swap was canceled for core', () => {
      console.error('Swap was stopped')
      this.setState({
        isStoppedSwap: true,
      })
    })

    super._persistSteps()
    this._persistState()
  }

  _persistState() {
    super._persistState()
  }

  _getSteps() {
    const flow = this

    return [

      // 1. Signs

      () => {
        flow.swap.room.once('swap sign', () => {
          flow.finishStep({
            isParticipantSigned: true,
          }, { step: 'sign', silentError: true })
        })

        flow.swap.room.once('swap exists', () => {
          flow.setState({
            isSwapExist: true,
          })
        })

        if (flow.state.isSwapExist) {
          flow.swap.room.once('refund completed', () => {
            flow.swap.room.sendMessage({
              event: 'request sign',
            })
          })
        } else {
          flow.swap.room.sendMessage({
            event: 'request sign',
          })
        }
      },
      // 2. Create secret, secret hash

      () => {
        // this.submitSecret()
      },

      // 3. Check balance

      () => {
        this.syncBalance()
      },

      // 4. Create BCH Script, fund, notify participant

      async () => {
        const { sellAmount } = flow.swap

        const onTransactionHash = (txID) => {
          if (flow.state.bchScriptCreatingTransactionHash) return

          flow.setState({
            bchScriptCreatingTransactionHash: txID,
          })

          flow.swap.room.on('request bch script', () => {
            flow.swap.room.sendMessage({
              event:  'create bch script',
              data: {
                scriptValues: flow.state.bchScriptValues,
                bchScriptCreatingTransactionHash: txID,
              }
            })
          })

          flow.swap.room.sendMessage({
            event: 'create bch script',
            data: {
              scriptValues : flow.state.bchScriptValues,
              bchScriptCreatingTransactionHash : txID,
            }
          })
        }

        // Balance on system wallet enough
        if (flow.state.isBalanceEnough) {
          await flow.bchSwap.fundScript({
            scriptValues: flow.state.bchScriptValues,
            amount: sellAmount,
          }, (hash) => {
            onTransactionHash(hash)

            flow.finishStep({
              isBchScriptFunded: true,
            }, { step: 'lock-bch' })
          })
        } else {
          const { bchScriptValues: scriptValues } = flow.state

          const checkBCHScriptBalance = async () => {

            const { scriptAddress } = this.bchSwap.createScript(scriptValues)
            const unspents = await this.bchSwap.fetchUnspents(scriptAddress)

            if (unspents.length === 0) {
              return false
            }

            const txID = unspents[0].txid
            onTransactionHash(txID)

            const balance = await this.bchSwap.getBalance(scriptValues)

            flow.setState({
              scriptBalance: BigNumber(balance).div(1e8).dp(8),
            })

            const isEnoughMoney = BigNumber(balance).isGreaterThanOrEqualTo(sellAmount.times(1e8))

            this.setState({
              isEnoughMoney,
            })
          }


          await util.helpers.repeatAsyncUntilResult((stopRepeat) => {
            if (!this.state.isEnoughMoney && !this.state.isStoppedSwap) {
              checkBCHScriptBalance()
            } else {
              stopRepeat()
            }
          })
          if (!this.state.isStoppedSwap) {
            flow.finishStep({
              isBchScriptFunded: true,
            }, { step: 'lock-bch' })
          }
        }
      },

      // 5. Wait participant creates ETH Contract

      () => {
        const { participant } = flow.swap
        let timer

        flow.swap.room.once('create eth contract', ({ ethSwapCreationTransactionHash }) => {
          flow.setState({
            ethSwapCreationTransactionHash,
          })
        })

        const checkEthBalance = () => {
          timer = setTimeout(async () => {
            const balance = await flow.ethSwap.getBalance({
              ownerAddress: participant.eth.address,
            })

            if (balance > 0) {
              if (!flow.state.isEthContractFunded) { // redundant condition but who cares :D
                flow.finishStep({
                  isEthContractFunded: true,
                }, { step: 'wait-lock-eth' })
              }
            }
            else {
              checkEthBalance()
            }
          }, 5 * 1000)
        }

        checkEthBalance()

        flow.swap.room.once('create eth contract', () => {
          if (!flow.state.isEthContractFunded) {
            clearTimeout(timer)
            timer = null

            flow.finishStep({
              isEthContractFunded: true,
            }, { step: 'wait-lock-eth' })
          }
        })
      },

      // 6. Withdraw

      async () => {
        const { buyAmount, participant } = flow.swap
        const { secretHash, secret } = flow.state

        const data = {
          ownerAddress:   participant.eth.address,
          secret,
        }

        const balanceCheckError = await flow.ethSwap.checkBalance({
          ownerAddress: participant.eth.address,
          participantAddress: this.app.services.auth.accounts.eth.address,
          expectedValue: buyAmount,
          expectedHash: secretHash,
        })

        if (balanceCheckError) {
          console.error('Waiting until deposit: ETH balance check error:', balanceCheckError)
          flow.swap.events.dispatch('eth balance check error', balanceCheckError)

          return
        }

        if (flow.ethSwap.hasTargetWallet()) {
          const targetWallet = await flow.ethSwap.getTargetWallet( participant.eth.address )
          const needTargetWallet = (flow.swap.destinationBuyAddress)
            ? flow.swap.destinationBuyAddress
            : this.app.services.auth.accounts.eth.address

          if (targetWallet.toLowerCase() !== needTargetWallet.toLowerCase()) {
            console.error(
              'Destination address for ether dismatch with needed (Needed, Getted). Stop swap now!',
              needTargetWallet,
              targetWallet,
            )
            flow.swap.events.dispatch('address for ether invalid', {
              needed: needTargetWallet,
              getted: targetWallet,
            })

            return
          }
        }

        const onWithdrawReady = () => {
          flow.swap.room.on('request ethWithdrawTxHash', () => {
            // Spot where there was an a vulnerability
            flow.swap.room.sendMessage({
              event: 'ethWithdrawTxHash',
              data: {
                ethSwapWithdrawTransactionHash: flow.state.ethSwapWithdrawTransactionHash,
              },
            })
          })

          flow.swap.room.sendMessage({
            event: 'finish eth withdraw',
          })

          flow.finishStep({
            isEthWithdrawn,
          }, 'withdraw-eth')
        }
        const tryWithdraw = async (stopRepeater) => {
          if (!flow.state.isEthWithdrawn) {
            try {
              const { withdrawFee } = flow.state

              if (!withdrawFee) {
                const withdrawNeededGas = await flow.ethSwap.calcWithdrawGas({
                  ownerAddress: data.ownerAddress,
                  secret,
                })
                flow.setState({
                  withdrawFee: withdrawNeededGas,
                })
                debug('swap.core:flow')('withdraw gas fee', withdrawNeededGas)
              }

              await flow.ethSwap.withdraw(data, (hash) => {
                flow.setState({
                  ethSwapWithdrawTransactionHash: hash,
                  canCreateEthTransaction: true,
                })

                // Spot where there was an a vulnerability
                flow.swap.room.sendMessage({
                  event: 'ethWithdrawTxHash',
                  data: {
                    ethSwapWithdrawTransactionHash: hash,
                  }
                })
              })
            } catch (err) {
              if ( /known transaction/.test(err.message) ) {
                console.error(`known tx: ${err.message}`)
              } else if ( /out of gas/.test(err.message) ) {
                console.error(`tx failed (wrong secret?): ${err.message}`)
              } else if ( /insufficient funds for gas/.test(err.message) ) {
                console.error(`insufficient fund for gas: ${err.message}`)

                debug('swap.core:flow')('insufficient fund for gas... wait fund or request other side to withdraw')

                const { requireWithdrawFee } = this.state

                if (!requireWithdrawFee) {
                  flow.swap.room.once('withdraw ready', ({ethSwapWithdrawTransactionHash}) => {
                    flow.setState({
                      ethSwapWithdrawTransactionHash,
                    })

                    onWithdrawReady()
                  })

                  flow.setState({
                    requireWithdrawFee: true,
                    canCreateEthTransaction: true,
                  })

                  stopRepeater()
                  return false
                }

              } else {
                console.error(err)
              }

              flow.setState({
                canCreateEthTransaction: false,
              })

              return null
            }
          }

          return true
        }

        const isEthWithdrawn = await util.helpers.repeatAsyncUntilResult((stopRepeater) =>
          tryWithdraw(stopRepeater),
        )

        if (isEthWithdrawn) {
          onWithdrawReady()
        }
      },

      // 7. Finish

      () => {
        flow.swap.room.once('swap finished', ({bchSwapWithdrawTransactionHash}) => {
          flow.setState({
            bchSwapWithdrawTransactionHash,
          })
          flow.finishStep({
            isFinished: true,
          })
        })
      },

      // 8. Finished!
      () => {

      }
    ]
  }

  /**
   * TODO - backport version compatibility
   *  mapped to sendWithdrawRequestToAnotherParticipant
   *  remove at next iteration after client software update
   *  Used in swap.react
   */
  sendWithdrawRequest() {
    return this.sendWithdrawRequestToAnotherParticipant()
  }

  sendWithdrawRequestToAnotherParticipant() {
    const flow = this

    if (!this.state.requireWithdrawFee) return
    if (this.state.requireWithdrawFeeSended) return

    this.setState({
      requireWithdrawFeeSended: true,
    })

    this.swap.room.on('accept withdraw request', () => {
      flow.swap.room.sendMessage({
        event: 'do withdraw',
        data: {
          secret: flow.state.secret,
        }
      })
    })

    this.swap.room.sendMessage({
      event: 'request withdraw',
    })
  }

  submitSecret(secret) {
    if (this.state.secret) { return }

    if (!this.state.isParticipantSigned) {
      throw new Error(`Cannot proceed: participant not signed. step=${this.state.step}`)
    }

    const secretHash = crypto.ripemd160(Buffer.from(secret, 'hex')).toString('hex')

    /* Secret hash generated - create BCH script - and only after this notify other part */
    this.createWorkBCHScript(secretHash);

    const _secret = `0x${secret.replace(/^0x/, '')}`

    this.finishStep({
      secret: _secret,
      secretHash,
    }, { step: 'submit-secret' })
  }

  createWorkBCHScript(secretHash) {
    if (this.state.bchScriptValues) {
      debug('swap.core:flow')('BCH Script already generated', this.state.bchScriptValues)
      return
    }

    const { participant } = this.swap
    // TODO move this somewhere!
    const utcNow = () => Math.floor(Date.now() / 1000)
    const getLockTime = () => utcNow() + 3600 * 3 // 3 hours from now

    const scriptValues = {
      secretHash:         secretHash,
      ownerPublicKey:     this.app.services.auth.accounts.bch.getPublicKey(),
      recipientPublicKey: participant.bch.publicKey,
      lockTime:           getLockTime(),
    }
    const { scriptAddress } = this.bchSwap.createScript(scriptValues)

    this.setState({
      scriptAddress: scriptAddress,
      bchScriptValues: scriptValues,
      scriptBalance: 0,
      scriptUnspendBalance: 0
    })
  }

  async syncBalance() {
    const { sellAmount } = this.swap

    this.setState({
      isBalanceFetching: true,
    })

    const bchAddress = this.app.services.auth.accounts.bch.getAddress()
    const balance = await this.bchSwap.fetchBalance()
    const txFee = await this.bchSwap.estimateFeeValue({ method: 'swap', fixed: true, address: bchAddress })

    const needAmount = sellAmount.plus(txFee)
    const isEnoughMoney = needAmount.isLessThanOrEqualTo(balance)

    if (isEnoughMoney) {
      this.finishStep({
        balance,
        createScriptFee: txFee,
        createScriptNeedAmount: needAmount,
        isBalanceFetching: false,
        isBalanceEnough: isEnoughMoney,
      }, { step: 'sync-balance' })
    } else {
      console.error(`Not enough money: ${balance} < ${needAmount} (${sellAmount} + txFee ${txFee})`)
    }
  }

  stopSwapProcess() { // вызывается из реакте
    this.setState({
      isStoppedSwap: true,
    })
    this.sendMessageAboutClose()
  }

  getRefundTxHex = () => {
    this.bchSwap.getRefundHexTransaction({
      scriptValues: this.state.bchScriptValues,
      secret: this.state.secret,
    })
      .then((txHex) => {
        this.setState({
          refundTxHex: txHex,
        })
      })
  }

  tryRefund() {
    return this.bchSwap.refund({
      scriptValues: this.state.bchScriptValues,
      secret: this.state.secret,
    }, (hash) => {
      this.setState({
        refundTransactionHash: hash,
        isRefunded: true,
      })
    })
      .then(() => {
        this.setState({
          isSwapExist: false,
        })
      })
  }

  async tryWithdraw(_secret) {
    const { secret, secretHash, isEthWithdrawn, isBchWithdrawn } = this.state

    if (!_secret)
      throw new Error(`Withdrawal is automatic. For manual withdrawal, provide a secret`)

    if (secret && secret != _secret)
      console.warn(`Secret already known and is different. Are you sure?`)

    if (isEthWithdrawn)
      console.warn(`Looks like money were already withdrawn, are you sure?`)

    debug('swap.core:flow')(`WITHDRAW using secret = ${_secret}`)

    const _secretHash = crypto.ripemd160(Buffer.from(_secret, 'hex')).toString('hex')

    if (secretHash != _secretHash)
      console.warn(`Hash does not match! state: ${secretHash}, given: ${_secretHash}`)

    const { participant } = this.swap

    const data = {
      ownerAddress:   participant.eth.address,
      secret:         _secret,
    }

    await this.ethSwap.withdraw(data, (hash) => {
      debug('swap.core:flow')(`TX hash=${hash}`)
      this.setState({
        ethSwapWithdrawTransactionHash: hash,
        canCreateEthTransaction: true,
      })
    }).then(() => {

      this.finishStep({
        isEthWithdrawn: true,
      }, 'withdraw-eth')
    })
  }

  async isRefundSuccess() {
    return true
  }
}

export default BCH2ETH
