import crypto from 'bitcoinjs-lib/src/crypto' // move to BtcSwap
import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'


class LTC2BTC extends Flow {

  static getName() {
    return `${this.getFromName()}2${this.getToName()}`
  }
  static getFromName() {
    return constants.COINS.ltc
  }
  static getToName() {
    return constants.COINS.btc
  }
  constructor(swap) {
    super(swap)

    this._flowName = LTC2BTC.getName()

    this.stepNumbers = {
      'sign': 1,
      'wait-lock-btc': 2,
      'verify-script': 3,
      'sync-balance': 4,
      'lock-ltc': 5,
      'wait-withdraw-ltc': 6, // aka getSecret
      'withdraw-btc': 7,
      'finish': 8,
      'end': 9
    }

    this.ltcSwap = swap.participantSwap
    this.btcSwap = swap.ownerSwap

    if (!this.ltcSwap) {
      throw new Error('BTC2LTC: "ltcSwap" of type object required')
    }
    if (!this.btcSwap) {
      throw new Error('BTC2LTC: "btcSwap" of type object required')
    }

    this.state = {
      step: 0,

      signTransactionHash: null,
      isSignFetching: false,
      isMeSigned: false,

      secretHash: null,
      btcScriptValues: null,
      ltcScriptValues: null,

      btcScriptVerified: false,

      isBalanceFetching: false,
      isBalanceEnough: false,
      balance: null,

      btcScriptCreatingTransactionHash: null,
      ltcSwapCreationTransactionHash: null,

      isLtcScriptFunded: false,

      secret: null,

      isLtcWithdrawn: false,
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
        console.log(`waiting verify btc script`)
        // this.verifyBtcScript()
      },

      // 4. Check balance

      () => {
        this.syncBalance()
        console.log(this)
      },

      // 5. Create LTC Script

      async () => {
        const { participant, buyAmount, sellAmount } = flow.swap
        let ltcSwapCreationTransactionHash

        // TODO move this somewhere!
        const utcNow = () => Math.floor(Date.now() / 1000)
        const getLockTime = () => utcNow() + 3600 * 1 // 1 hour from now

        const scriptCheckResult = await flow.btcSwap.checkScript(flow.state.btcScriptValues, {
          value: buyAmount,
          recipientPublicKey: SwapApp.services.auth.accounts.btc.getPublicKey(),
          lockTime: getLockTime(),
        })

        if (scriptCheckResult) {
          console.error(`Btc script check error:`, scriptCheckResult)
          flow.swap.events.dispatch('btc script check error', scriptCheckResult)
          return
        }

        const scriptValues = {
          secretHash:         flow.state.secretHash,
          ownerPublicKey:     SwapApp.services.auth.accounts.ltc.getPublicKey(),
          recipientPublicKey: participant.ltc.publicKey,
          lockTime:           getLockTime(),
        }

        try {
          await flow.ltcSwap.fundScript({
            scriptValues,
            amount: sellAmount,
          }, (hash) => {
            ltcSwapCreationTransactionHash = hash
            flow.setState({
              ltcSwapCreationTransactionHash: hash,
            })
          })
        } catch (err) {
          // TODO user can stuck here after page reload...
          if ( /known transaction/.test(err.message) )
            return console.error(`known tx: ${err.message}`)
          else if ( /out of gas/.test(err.message) )
            return console.error(`tx failed (wrong secret?): ${err.message}`)
          else
            return console.error(err)
        }

        flow.swap.room.on('request ltc script', () => {
          flow.swap.room.sendMessage({
            event: 'create ltc script',
            data: {
              scriptValues,
              ltcSwapCreationTransactionHash,
            }
          })
        })

        flow.swap.room.sendMessage({
          event: 'create ltc script',
          data: {
            scriptValues,
            ltcSwapCreationTransactionHash,
          }
        })

        flow.finishStep({
          isLtcScriptFunded: true,
          ltcScriptValues: scriptValues,
        }, { step: 'lock-ltc' })
      },

      // 6. Wait participant withdraw

      () => {

        flow.swap.room.once('ltcWithdrawTxHash', async ({ ltcSwapWithdrawTransactionHash }) => {
          flow.setState({
            ltcSwapWithdrawTransactionHash,
          })

          const secret = await flow.ltcSwap.getSecretFromTxhash(ltcSwapWithdrawTransactionHash)

          if (!flow.state.isLtcWithdrawn && secret) {
            flow.finishStep({
              isLtcWithdrawn: true,
              secret,
            }, { step: 'wait-withdraw-ltc' })
          }
        })

        flow.swap.room.sendMessage({
          event: 'request ltcWithdrawTxHash',
        })
      },

      // 7. Withdraw

      async () => {
        let { secret, btcScriptValues } = flow.state

        if (!btcScriptValues) {
          console.error('There is no "btcScriptValues" in state. No way to continue swap...')
          return
        }

        await flow.btcSwap.withdraw({
          scriptValues: flow.state.btcScriptValues,
          secret,
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
      ownerAddress:       SwapApp.services.auth.accounts.ltc.address,
      participantAddress: participant.ltc.address
    }

    return false//this.ltcSwap.checkSwapExists(swapData)
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

    const balance = await this.ltcSwap.fetchBalance(SwapApp.services.auth.accounts.ltc.getAddress())

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

  getRefundTxHex = () => {
    this.ltcSwap.getRefundHexTransaction({
      scriptValues: this.state.ltcScriptValues,
      secret: this.state.secret,
    })
      .then((txHex) => {
        this.setState({
          refundTxHex: txHex,
        })
      })
  }

  tryRefund() {
    const { participant } = this.swap

    return this.ltcSwap.refund({
      scriptValues: this.state.ltcScriptValues,
      secret: this.state.secret,
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
  const { secret, secretHash, isLtcWithdrawn, isBtcWithdrawn, btcScriptValues } = this.state
    if (!_secret)
      throw new Error(`Withdrawal is automatic. For manual withdrawal, provide a secret`)

    if (!btcScriptValues)
      throw new Error(`Cannot withdraw without script values`)

    if (secret && secret != _secret)
      console.warn(`Secret already known and is different. Are you sure?`)

    if (isBtcWithdrawn)
      console.warn(`Looks like money were already withdrawn, are you sure?`)

    console.log(`WITHDRAW using secret = ${_secret}`)

    const _secretHash = crypto.ripemd160(Buffer.from(_secret, 'hex')).toString('hex')
    if (secretHash != _secretHash)
      console.warn(`Hash does not match!`)

    const { scriptAddress } = this.btcSwap.createScript(btcScriptValues)
    const balance = await this.btcSwap.getBalance(scriptAddress)

    console.log(`address=${scriptAddress}, balance=${balance}`)

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
      console.log(`TX hash=${hash}`)
      this.setState({
        btcSwapWithdrawTransactionHash: hash,
      })
    })
    console.log(`TX withdraw sent: ${this.state.btcSwapWithdrawTransactionHash}`)

    this.finishStep({
      isBtcWithdrawn: true,
    }, { step: 'withdraw-btc' })
  }

}


export default LTC2BTC
