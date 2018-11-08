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

        // 2. Create secret, secret hash and BTC script

        () => {
          // this.submitSecret()
        },

        // 3. Check system wallet balance

        () => {
          this.syncBalance()
        },

        // 4. Fund BTC Script if balance enough - else infinity loop BTC balance check, notify participant

        async () => {
          const { sellAmount } = flow.swap

          let btcScriptCreatingTransactionHash

          const onBTCFuncSuccess = (txID) => {

            flow.swap.room.on('request btc script', () => {
              flow.swap.room.sendMessage({
                event:  'create btc script',
                data: {
                  scriptValues : flow.state.btcScriptValues,
                  btcScriptCreatingTransactionHash : txID,
                }
              })
            })

            flow.swap.room.sendMessage({
              event: 'create btc script',
              data: {
                scriptValues : flow.state.btcScriptValues,
                btcScriptCreatingTransactionHash : txID,
              }
            })

            flow.finishStep({
              isBtcScriptFunded: true
            }, {  step: 'lock-btc' })
          }

          // Balance on system wallet enough
          if (flow.state.isBalanceEnough) {
            await flow.btcSwap.fundScript({
              scriptValues : flow.state.btcScriptValues,
              amount: sellAmount,
            }, (hash) => {
              btcScriptCreatingTransactionHash = hash

              flow.setState({
                btcScriptCreatingTransactionHash: hash,
              })

              onBTCFuncSuccess(hash)
            })
          } else {
            let btcCheckTimer;

            const checkBTCScriptBalance = () => {
              btcCheckTimer = setTimeout( async () => {
                const { sellAmount } = flow.swap

                let txID = false

                const unspends = await this.btcSwap.fetchUnspents(flow.state.scriptAddress);
                if (unspends.length)
                  txID = unspends[0].txID;

                const unconfirmedTotalSatoshi = BigInt(unspends.reduce( ( summ, txData ) => {
                  return summ + (!txData.confirmations) ? txData.satoshis : 0;
                } , 0 ));
                const unconfirmedTotal = unspends.reduce( ( summ, txData ) => {
                  return summ + (!txData.confirmations) ? txData.amount : 0;
                } , 0 );

                const balance = await this.btcSwap.getBalance(flow.state.scriptAddress);

                const balanceSatoshi = BigInt(balance*1e8);

                flow.setState({
                  scriptBalance : balance,
                  scriptUnconfirmedBalance : unconfirmedTotal
                });
                const balanceOnScript = balanceSatoshi + unconfirmedTotalSatoshi + BigInt(this.btcSwap.getTxFee( true ) );
                const isEnoughMoney = sellAmount.multipliedBy(1e8).isLessThanOrEqualTo( balanceOnScript );

                if (isEnoughMoney) {
                  onBTCFuncSuccess(txID)
                } else {
                  checkBTCScriptBalance()
                }
              }, 20 * 1000)
            }
            checkBTCScriptBalance();
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

          flow.waitEthBalance().then( (balance) => {
            if (balance > 0) {
              if (!flow.state.isEthContractFunded) { // redundant condition but who cares :D
                flow.finishStep({
                  isEthContractFunded: true,
                }, { step: 'wait-lock-eth' })
              }
            }
          } );

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

          const balanceCheckResult = await flow.waitEthBalance();
          if (!balanceCheckResult) {
            console.error(`Waiting until deposit: ETH balance check error:`, balanceCheckResult)
            flow.swap.events.dispatch('eth balance check error', balanceCheckResult)
            return
          }

          const targetWallet = await flow.ethTokenSwap.getTargetWallet( participant.eth.address );
          const needTargetWallet = (flow.swap.destinationBuyAddress) ? flow.swap.destinationBuyAddress : SwapApp.services.auth.accounts.eth.address;

          if (targetWallet != needTargetWallet) {
            console.error("Destination address for tokens dismatch with needed (Needed, Getted). Stop swap now!",needTargetWallet,targetWallet);
            flow.swap.events.dispatch('address for tokens invalid', { needed : needTargetWallet, getted : targetWallet });
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

    async waitEthBalance() {
      const flow = this;
      const participant = this.swap.participant;

      return new Promise((resolve, reject) => {
        const checkEthBalance =  async () => {
          const balance = await flow.ethTokenSwap.getBalance({
            ownerAddress: participant.eth.address,
          })
          if (balance > 0) {
            resolve( balance );
          }
          else {
            setTimeout( checkEthBalance, 20 * 1000 );
          }
        }

        checkEthBalance()
      } );
    }

    submitSecret(secret) {
      if (this.state.secretHash) { return }

      if (!this.state.isParticipantSigned) {
        throw new Error(`Cannot proceed: participant not signed. step=${this.state.step}`)
      }

      const secretHash = crypto.ripemd160(Buffer.from(secret, 'hex')).toString('hex')

      /* Secret hash generated - create BTC script - and only after this notify other part */
      this.createWorkBTCScript(secretHash);

      this.finishStep({
        secret,
        secretHash,
      }, { step: 'submit-secret' })
    }

    getBTCScriptAddress() {
      return this.state.scriptAddress;
    }
    createWorkBTCScript(secretHash) {
      if (this.state.btcScriptValues) {
        console.log('BTC Script already generated',this.state.btcScriptValues);
        return;
      }
      const { participant } = this.swap
      // TODO move this somewhere!
      const utcNow = () => Math.floor(Date.now() / 1000)
      const getLockTime = () => utcNow() + 3600 * 3 // 3 hours from now

      const scriptValues = {
        secretHash:         secretHash,
        ownerPublicKey:     SwapApp.services.auth.accounts.btc.getPublicKey(),
        recipientPublicKey: participant.btc.publicKey,
        lockTime:           getLockTime(),
      }
      const scriptData = this.btcSwap.createScript(scriptValues)

      this.setState( {
        scriptAddress : scriptData.scriptAddress,
        btcScriptValues: scriptValues,
        scriptBalance : 0,
        scriptUnspendBalance : 0
      } );
    }

    async checkScriptBalance() {
      console.log("BTC2ETHTOKEN checkScriptBalance - nothing do - empty :p - wait infinity loop");
    }

    async syncBalance() {
      const { sellAmount } = this.swap

      this.setState({
        isBalanceFetching: true,
      })

      const balance = await this.btcSwap.fetchBalance(SwapApp.services.auth.accounts.btc.getAddress())
      const isEnoughMoney = sellAmount.isLessThanOrEqualTo(balance)

      if (!isEnoughMoney) {
        console.error(`Not enough money: ${balance} < ${sellAmount}`)
      }
      this.finishStep({
        balance,
        isBalanceFetching: false,
        isBalanceEnough: isEnoughMoney,
      }, { step: 'sync-balance' })
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
