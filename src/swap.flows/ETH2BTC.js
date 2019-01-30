import debug from 'debug'
import crypto from 'bitcoinjs-lib/src/crypto' // move to BtcSwap
import SwapApp, { constants, util } from 'swap.app'
import { Flow } from 'swap.swap'


class ETH2BTC extends Flow {

  static getName() {
    return `${this.getFromName()}2${this.getToName()}`
  }
  static getFromName() {
    return constants.COINS.eth
  }
  static getToName() {
    return constants.COINS.btc
  }
  constructor(swap) {
    super(swap)

    this._flowName = ETH2BTC.getName()

    this.stepNumbers = {
      'sign': 1,
      'wait-lock-btc': 2,
      'verify-script': 3,
      'sync-balance': 4,
      'lock-eth': 5,
      'wait-withdraw-eth': 6, // aka getSecret
      'withdraw-btc': 7,
      'finish': 8,
      'end': 9
    }

    this.ethSwap = swap.participantSwap
    this.btcSwap = swap.ownerSwap

    if (!this.ethSwap) {
      throw new Error('BTC2ETH: "ethSwap" of type object required')
    }
    if (!this.btcSwap) {
      throw new Error('BTC2ETH: "btcSwap" of type object required')
    }

    this.state = {
      step: 0,

      signTransactionHash: null,
      isSignFetching: false,
      isMeSigned: false,

      secretHash: null,
      btcScriptValues: null,

      btcScriptVerified: false,

      isBalanceFetching: false,
      isBalanceEnough: false,
      balance: null,

      btcScriptCreatingTransactionHash: null,
      ethSwapCreationTransactionHash: null,
      canCreateEthTransaction: true,
      isEthContractFunded: false,

      secret: null,

      isEthWithdrawn: false,
      isBtcWithdrawn: false,

      refundTransactionHash: null,
      isRefunded: false,

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

      // 1. Sign swap to start

      () => {
        // this.sign()
      },

      // 2. Wait participant create, fund BTC Script

      () => {
        flow.swap.room.once('create btc script', ({ scriptValues, btcScriptCreatingTransactionHash }) => {
          flow.finishStep({
            secretHash: scriptValues.secretHash,
            btcScriptValues: scriptValues,
            btcScriptCreatingTransactionHash,
          }, { step: 'wait-lock-btc', silentError: true })
        })

        flow.swap.room.sendMessage({
          event: 'request btc script',
        })
      },

      // 3. Verify BTC Script

      () => {
        debug('swap.core:flow')(`waiting verify btc script`)
        // this.verifyBtcScript()
      },

      // 4. Check balance

      () => {
        this.syncBalance()
      },

      // 5. Create ETH Contract

      async () => {
        const { participant, buyAmount, sellAmount } = flow.swap

        // TODO move this somewhere!
        const utcNow = () => Math.floor(Date.now() / 1000)
        const getLockTime = () => utcNow() + 3600 * 1 // 1 hour from now

        const scriptCheckResult = await flow.btcSwap.checkScript(flow.state.btcScriptValues, {
          value: buyAmount,
          recipientPublicKey: this.app.services.auth.accounts.btc.getPublicKey(),
          lockTime: getLockTime(),
        })

        if (scriptCheckResult) {
          console.error(`Btc script check error:`, scriptCheckResult)
          flow.swap.events.dispatch('btc script check error', scriptCheckResult)

          return
        }

        const swapData = {
          participantAddress: participant.eth.address,
          secretHash: flow.state.secretHash,
          amount: sellAmount,
          targetWallet: flow.swap.destinationSellAddress
        }

        const tryCreateSwapKeyName = `${flow.swap.id}.tryCreateSwap`

        const tryCreateSwap = async (currentKey) => {
          if (!util.actualKey.compare(this.app, tryCreateSwapKeyName, currentKey)) {
            return false
          }

          if (!flow.state.isEthContractFunded) {
            try {
              debug('swap.core:flow')('create swap', swapData)
              await this.ethSwap.create(swapData, (hash) => {
                debug('swap.core:flow')('create swap tx hash', hash)
                flow.swap.room.sendMessage({
                  event: 'create eth contract',
                  data: {
                    ethSwapCreationTransactionHash: hash,
                  },
                })

                flow.setState({
                  ethSwapCreationTransactionHash: hash,
                  canCreateEthTransaction: true,
                })

                util.actualKey.remove(this.app, tryCreateSwapKeyName)
              })
            } catch (err) {
              if ( /known transaction/.test(err.message) ) {
                console.error(`known tx: ${err.message}`)
              } else if ( /out of gas/.test(err.message) ) {
                console.error(`tx failed (wrong secret?): ${err.message}`)
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

        const tryCreateSwapKey = util.actualKey.create(this.app, tryCreateSwapKeyName)

        const isEthContractFunded = await util.helpers.repeatAsyncUntilResult(() =>
          tryCreateSwap(tryCreateSwapKey),
        )

        if (isEthContractFunded) {
          debug('swap.core:flow')(`finish step`)
          flow.finishStep({
            isEthContractFunded,
          }, {step: 'lock-eth'})
        }
      },

      // 6. Wait participant withdraw

      async () => {
        flow.swap.room.once('ethWithdrawTxHash', async ({ ethSwapWithdrawTransactionHash }) => {
          flow.setState({
            ethSwapWithdrawTransactionHash,
          })

          const secret = await flow.ethSwap.getSecretFromTxhash(ethSwapWithdrawTransactionHash)

          if (!flow.state.isEthWithdrawn && secret) {
            const _secret = `0x${secret.replace(/^0x/, '')}`

            debug('swap.core:flow')('got secret from tx', ethSwapWithdrawTransactionHash, _secret)

            flow.finishStep({
              isEthWithdrawn: true,
              secret: _secret,
            }, { step: 'wait-withdraw-eth' })
          }
        })

        flow.swap.room.sendMessage({
          event: 'request ethWithdrawTxHash',
        })

        // If partner decides to scam and doesn't send ethWithdrawTxHash
        // then we try to withdraw as in ETHTOKEN2USDT

        const { participant } = flow.swap

        const checkSecretExist = async () => {
          try {
            const secret = await flow.ethSwap.getSecret({
              participantAddress: participant.eth.address,
            })

            if (secret) {
              clearInterval(checkSecretTimer)

              const _secret = `0x${secret.replace(/^0x/, '')}`

              if (flow.state.secret && _secret !== flow.state.secret) {
                throw new Error(`Secret already exists and it differs! ${_secret} ≠ ${flow.state.secret}`)
              }

              debug('swap.core:flow')('got secret from smart contract', _secret)
              flow.finishStep({
                secret: _secret,
                isEthWithdrawn: true,
              }, { step: 'wait-withdraw-eth' })
            }
          }
          catch (err) { console.error(err) }
        }

        const checkSecretTimer = setInterval(checkSecretExist, 20 * 1000)

        flow.swap.room.once('finish eth withdraw', () => {
          checkSecretExist()
        })

      },

      // 7. Withdraw

      async () => {
        let { secret, btcScriptValues } = flow.state

        if (!btcScriptValues) {
          console.error('There is no "btcScriptValues" in state. No way to continue swap...')
          return
        }

        console.log("Debug - destination address....")
        await flow.btcSwap.withdraw({
          scriptValues: flow.state.btcScriptValues,
          secret,
          destinationAddress: flow.swap.destinationBuyAddress,
        }, (hash) => {
          flow.setState({
            btcSwapWithdrawTransactionHash: hash,
          })
        })



        flow.finishStep({
          isBtcWithdrawn: true,
        }, { step: 'withdraw-btc' })
      },

      // 8. Finish

      () => {
        flow.swap.room.sendMessage({
          event: 'swap finished',
        })

        flow.finishStep({
          isFinished: true,
        }, { step: 'finish' })
      },

      // 9. Finished!
      () => {

      }
    ]
  }

  _checkSwapAlreadyExists() {
    const { participant } = this.swap

    const swapData = {
      ownerAddress:       this.app.services.auth.accounts.eth.address,
      participantAddress: participant.eth.address
    }

    return this.ethSwap.checkSwapExists(swapData)
  }

  async sign() {
    const swapExists = await this._checkSwapAlreadyExists()

    if (swapExists) {
      this.swap.room.sendMessage({
        event: 'swap exists',
      })

      this.setState({
        isSwapExist: true,
      })
    } else {
      this.setState({
        isSignFetching: true,
      })

      this.swap.room.on('request sign', () => {
        this.swap.room.sendMessage({
          event: 'swap sign',
        })
      })

      this.swap.room.sendMessage({
        event: 'swap sign',
      })

      this.finishStep({
        isMeSigned: true,
      }, { step: 'sign', silentError: true })

      return true
    }
  }


  verifyBtcScript() {
    if (this.state.btcScriptVerified) {
      return true
    }
    if (!this.state.btcScriptValues) {
      throw new Error(`No script, cannot verify`)
    }

    this.finishStep({
      btcScriptVerified: true,
    }, { step: 'verify-script' })

    return true
  }

  async syncBalance() {
    const { sellAmount } = this.swap

    this.setState({
      isBalanceFetching: true,
    })

    const balance = await this.ethSwap.fetchBalance(this.app.services.auth.accounts.eth.address)
    const isEnoughMoney = sellAmount.isLessThanOrEqualTo(balance)

    if (isEnoughMoney) {
      this.finishStep({
        balance,
        isBalanceFetching: false,
        isBalanceEnough: true,
      }, { step: 'sync-balance' })
    }
    else {
      this.setState({
        balance,
        isBalanceFetching: false,
        isBalanceEnough: false,
      })
    }
  }

  tryRefund() {
    const { participant } = this.swap

    return this.ethSwap.refund({
      participantAddress: participant.eth.address,
    }, (hash) => {
      this.setState({
        refundTransactionHash: hash,
        isRefunded: true,
      })
    })
      .then(() => {
        this.swap.room.sendMessage({
          event: 'refund completed',
        })

        this.setState({
          isSwapExist: false,
        })
      })
  }

  async tryWithdraw(_secret) {
  const { secret, secretHash, isEthWithdrawn, isBtcWithdrawn, btcScriptValues } = this.state
    if (!_secret)
      throw new Error(`Withdrawal is automatic. For manual withdrawal, provide a secret`)

    if (!btcScriptValues)
      throw new Error(`Cannot withdraw without script values`)

    if (secret && secret != _secret)
      console.warn(`Secret already known and is different. Are you sure?`)

    if (isBtcWithdrawn)
      console.warn(`Looks like money were already withdrawn, are you sure?`)

    debug('swap.core:flow')(`WITHDRAW using secret = ${_secret}`)

    const _secretHash = crypto.ripemd160(Buffer.from(_secret, 'hex')).toString('hex')
    if (secretHash != _secretHash)
      console.warn(`Hash does not match!`)

    const { scriptAddress } = this.btcSwap.createScript(btcScriptValues)
    const balance = await this.btcSwap.getBalance(scriptAddress)

    debug('swap.core:flow')(`address=${scriptAddress}, balance=${balance}`)

    if (balance === 0) {
      this.finishStep({
        isBtcWithdrawn: true,
      }, { step: 'withdraw-btc' })
      throw new Error(`Already withdrawn: address=${scriptAddress},balance=${balance}`)
    }

    await this.btcSwap.withdraw({
      scriptValues: btcScriptValues,
      secret: _secret,
    }, (hash) => {
      debug('swap.core:flow')(`TX hash=${hash}`)
      this.setState({
        btcSwapWithdrawTransactionHash: hash,
      })
    })
    debug('swap.core:flow')(`TX withdraw sent: ${this.state.btcSwapWithdrawTransactionHash}`)

    this.finishStep({
      isBtcWithdrawn: true,
    }, { step: 'withdraw-btc' })
  }

}


export default ETH2BTC
