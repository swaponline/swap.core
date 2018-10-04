import crypto from 'bitcoinjs-lib/src/crypto'
import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'


export default (tokenName) => {

  class BTC2ETHTOKEN extends Flow {

    static getName() {
      return `${this.getFromName()}2${this.getToName()}`
    }
    static getFromName() {
      return constants.COINS.btc
    }
    static getToName() {
      return tokenName.toUpperCase()
    }
    constructor(swap) {
      super(swap)

      this._flowName = BTC2ETHTOKEN.getName()

      this.stepNumbers = {
        'sign': 1,
        'submit-secret': 2,
        'sync-balance': 3,
        'lock-btc': 4,
        'wait-lock-eth': 5,
        'withdraw-eth': 6,
        'finish': 7,
        'end': 8
      }

      this.ethTokenSwap = swap.ownerSwap
      this.btcSwap      = swap.participantSwap

      this.allowFundBTCDirectly = false;
      
      if (!this.ethTokenSwap) {
        throw new Error('BTC2ETH: "ethTokenSwap" of type object required')
      }
      if (!this.btcSwap) {
        throw new Error('BTC2ETH: "btcSwap" of type object required')
      }

      this.state = {
        step: 0,

        signTransactionHash: null,
        isSignFetching: false,
        isParticipantSigned: false,

        btcScriptCreatingTransactionHash: null,
        ethSwapCreationTransactionHash: null,

        secretHash: null,
        btcScriptValues: null,

        btcScriptVerified: false,

        isBalanceFetching: false,
        isBalanceEnough: false,
        balance: null,

        isEthContractFunded: false,

        ethSwapWithdrawTransactionHash: null,
        isEthWithdrawn: false,
        isBtcWithdrawn: false,

        refundTxHex: null,
        isFinished: false,
        isSwapExist: false,
      }

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

        // 4. Create BTC Script, fund, notify participant

        async () => {
          const { sellAmount, participant } = flow.swap
          let btcScriptCreatingTransactionHash

          // TODO move this somewhere!
          const utcNow = () => Math.floor(Date.now() / 1000)
          const getLockTime = () => utcNow() + 3600 * 3 // 3 hours from now

          const scriptValues = {
            secretHash:         flow.state.secretHash,
            ownerPublicKey:     SwapApp.services.auth.accounts.btc.getPublicKey(),
            recipientPublicKey: participant.btc.publicKey,
            lockTime:           getLockTime(),
          }
          if (flow.state.isBalanceEnough) {
            await flow.btcSwap.fundScript({
              scriptValues,
              amount: sellAmount,
            }, (hash) => {
              btcScriptCreatingTransactionHash = hash

              flow.setState({
                btcScriptCreatingTransactionHash: hash,
              })
            })

            flow.swap.room.on('request btc script', () => {
              flow.swap.room.sendMessage({
                event:  'create btc script',
                data: {
                  scriptValues,
                  btcScriptCreatingTransactionHash,
                }
              })
            })

            flow.swap.room.sendMessage({
              event: 'create btc script',
              data: {
                scriptValues,
                btcScriptCreatingTransactionHash,
              }
            })

            flow.finishStep({
              isBtcScriptFunded: true,
              btcScriptValues: scriptValues,
            }, {  step: 'lock-btc' })
          } else {
            const scriptData = flow.btcSwap.createScript(scriptValues)
            flow.setState( {
              scriptData : scriptData,
              scriptBalance : 0,
              scriptUnspendBlance : 0
            } );
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
              const balance = await flow.ethTokenSwap.getBalance({
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
            }, 20 * 1000)
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

          const data = {
            ownerAddress:   participant.eth.address,
            secret:         flow.state.secret,
          }

          const balanceCheckResult = await flow.ethTokenSwap.checkBalance({
            ownerAddress: participant.eth.address,
            expectedValue: buyAmount,
          })

          if (balanceCheckResult) {
            console.error(`Waiting until deposit: ETH balance check error:`, balanceCheckResult)
            flow.swap.events.dispatch('eth balance check error', balanceCheckResult)
            return
          }

          try {
            await flow.ethTokenSwap.withdraw(data, (hash) => {
              flow.setState({
                ethSwapWithdrawTransactionHash: hash,
              })

              flow.swap.room.sendMessage({
                event: 'ethWithdrawTxHash',
                data: {
                  ethSwapWithdrawTransactionHash: hash,
                }
              })
            })
          } catch (err) {
            // TODO user can stuck here after page reload...
            if ( !/known transaction/.test(err.message) ) console.error(err)
            return
          }

          flow.swap.room.on('request ethWithdrawTxHash', () => {
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
            isEthWithdrawn: true,
          })
        },

        // 7. Finish

        () => {
          flow.swap.room.once('swap finished', () => {
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

    submitSecret(secret) {
      if (this.state.secretHash) { return }

      if (!this.state.isParticipantSigned) {
        throw new Error(`Cannot proceed: participant not signed. step=${this.state.step}`)
      }

      const secretHash = crypto.ripemd160(Buffer.from(secret, 'hex')).toString('hex')

      this.finishStep({
        secret,
        secretHash,
      }, { step: 'submit-secret' })
    }

    async checkScriptBalance() {
      if (!this.state.isBalanceEnough) {
        const { sellAmount } = this.swap

        this.setState({
          isBalanceFetching: true,
          isBalanceEnough: false,
        });
        const balance = await this.btcSwap.fetchBalance(this.state.scriptData.scriptAddress);
        this.setState({
          scriptBalance : balance
        });
        const unspend = await this.btcSwap.fetchUnspents(this.state.scriptData.scriptAddress);
        let unspendTotal = 0;
        for (var i in unspend) {
          if (!unspend.confirmations) {
            unspendTotal = unspendTotal+unspend[i].amount;
          }
        };
        const isEnoughMoney = sellAmount.isLessThanOrEqualTo(balance+unspendTotal+this.btcSwap.getTxFee());
        this.setState( {
          scriptUnspendBlance : unspendTotal,
          isBalanceFetching : false,
          isBalanceEnough: isEnoughMoney,
        } );
        if (isEnoughMoney) {
          const flow = this;
          const scriptValues = flow.state.btcScriptValues
          const btcScriptCreatingTransactionHash = flow.state.scriptData.scriptAddress;
          
          flow.setState({
            btcScriptCreatingTransactionHash: flow.state.scriptData.scriptAddress,
          })

          flow.swap.room.on('request btc script', () => {
            flow.swap.room.sendMessage({
              event:  'create btc script',
              data: {
                scriptValues,
                btcScriptCreatingTransactionHash,
              }
            })
          })

          flow.swap.room.sendMessage({
            event: 'create btc script',
            data: {
              scriptValues,
              btcScriptCreatingTransactionHash,
            }
          })

          flow.finishStep({
            isBtcScriptFunded: true
          })
        }
      }
    }

    async syncBalance() {
      const { sellAmount } = this.swap

      this.setState({
        isBalanceFetching: true,
      })

      const balance = await this.btcSwap.fetchBalance(SwapApp.services.auth.accounts.btc.getAddress())
      const isEnoughMoney = sellAmount.isLessThanOrEqualTo(balance)

      if (isEnoughMoney) {
        this.finishStep({
          balance,
          isBalanceFetching: false,
          isBalanceEnough: true,
        }, { step: 'sync-balance' })
      }
      else {
        if (this.allowFundBTCDirectly) {
          this.finishStep({
            balance,
            isBalanceFetching: false,
            isBalanceEnough: false,
          }, { step: 'sync-balance' })
        } else {
          console.error(`Not enough money: ${balance} < ${sellAmount}`)
          this.setState({
            balance,
            isBalanceFetching: false,
            isBalanceEnough: false,
          })
        }
      }
    }

    getRefundTxHex = () => {
      this.btcSwap.getRefundHexTransaction({
        scriptValues: this.state.btcScriptValues,
        secret: this.state.secret,
      })
        .then((txHex) => {
          this.setState({
            refundTxHex: txHex,
          })
        })
    }

    tryRefund() {
      return this.btcSwap.refund({
        scriptValues: this.state.btcScriptValues,
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
  }

  return BTC2ETHTOKEN
}
