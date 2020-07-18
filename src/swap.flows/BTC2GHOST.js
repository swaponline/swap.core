import debug from 'debug'
import crypto from 'bitcoinjs-lib/src/crypto' // move to BtcSwap
import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'


class BTC2GHOST extends Flow {

  static getName() {
    return `${this.getFromName()}2${this.getToName()}`
  }
  static getFromName() {
    return constants.COINS.btc
  }
  static getToName() {
    return constants.COINS.ghost
  }
  constructor(swap) {
    super(swap)

    this._flowName = BTC2GHOST.getName()

    this.stepNumbers = {
      'sign': 1,
      'wait-lock-ghost': 2,
      'verify-script': 3,
      'sync-balance': 4,
      'lock-btc': 5,
      'wait-withdraw-btc': 6, // aka getSecret
      'withdraw-ghost': 7,
      'finish': 8,
      'end': 9
    }

    this.ghostSwap = swap.ownerSwap
    this.btcSwap = swap.participantSwap

    if (!this.ghostSwap) {
      throw new Error('BTC2GHOST: "ghostSwap" of type object required')
    }
    if (!this.btcSwap) {
      throw new Error('BTC2GHOST: "btcSwap" of type object required')
    }

    this.state = {
      step: 0,

      signTransactionHash: null,
      isSignFetching: false,
      isMeSigned: false,

      secretHash: null,
      btcScriptValues: null,
      ghostScriptValues: null,

      ghostScriptVerified: false,

      isBalanceFetching: false,
      isBalanceEnough: false,
      balance: null,

      btcScriptCreatingTransactionHash: null,
      ghostSwapCreationTransactionHash: null,

      isGhostScriptFunded: false,

      secret: null,

      isGhostWithdrawn: false,
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

      // 2. Wait participant create, fund GHOST Script

      () => {
        flow.swap.room.once('create ghost script', ({ scriptValues, ghostScriptCreatingTransactionHash }) => {
          flow.finishStep({
            secretHash: scriptValues.secretHash,
            ghostScriptValues: scriptValues,
            ghostScriptCreatingTransactionHash,
          }, { step: 'wait-lock-ghost', silentError: true })
        })

        flow.swap.room.sendMessage({
          event: 'request ghost script',
        })
      },

      // 3. Verify GHOST Script

      () => {
        debug('swap.core:flow')(`waiting verify ghost script`)
        // this.verifyBtcScript()
      },

      // 4. Check balance

      () => {
        this.syncBalance()
        debug('swap.core:flow')(this)
      },

      // 5. Create BTC Script

      async () => {
        const { participant, buyAmount, sellAmount } = flow.swap
        let btcSwapCreationTransactionHash

        // TODO move this somewhere!
        const utcNow = () => Math.floor(Date.now() / 1000)
        const getLockTime = () => utcNow() + 3600 * 1 // 1 hour from now

        const scriptCheckResult = await flow.ghostSwap.checkScript(flow.state.btcScriptValues, {
          value: buyAmount,
          recipientPublicKey: this.app.services.auth.accounts.btc.getPublicKey(),
          lockTime: getLockTime(),
        })

        if (scriptCheckResult) {
          console.error(`Ghost script check error:`, scriptCheckResult)
          flow.swap.events.dispatch('ghost script check error', scriptCheckResult)
          return
        }

        const scriptValues = {
          secretHash:         flow.state.secretHash,
          ownerPublicKey:     this.app.services.auth.accounts.btc.getPublicKey(),
          recipientPublicKey: participant.btc.publicKey,
          lockTime:           getLockTime(),
        }

        try {
          await flow.btcSwap.fundScript({
            scriptValues,
            amount: sellAmount,
          }, (hash) => {
            btcSwapCreationTransactionHash = hash
            flow.setState({
              btcSwapCreationTransactionHash: hash,
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

        flow.swap.room.on('request btc script', () => {
          flow.swap.room.sendMessage({
            event: 'create btc script',
            data: {
              scriptValues,
              btcSwapCreationTransactionHash,
            }
          })
        })

        flow.swap.room.sendMessage({
          event: 'create btc script',
          data: {
            scriptValues,
            btcSwapCreationTransactionHash,
          }
        })

        flow.finishStep({
          isBTCScriptFunded: true,
          btcScriptValues: scriptValues,
        }, { step: 'lock-btc' })
      },

      // 6. Wait participant withdraw

      () => {

        flow.swap.room.once('btcWithdrawTxHash', async ({ btcSwapWithdrawTransactionHash }) => {
          flow.setState({
            btcSwapWithdrawTransactionHash,
          })

          const secret = await flow.btcSwap.getSecretFromTxhash(btcSwapWithdrawTransactionHash)

          if (!flow.state.isBtcWithdrawn && secret) {
            flow.finishStep({
              isBtcWithdrawn: true,
              secret,
            }, { step: 'wait-withdraw-btc' })
          }
        })

        flow.swap.room.sendMessage({
          event: 'request btcWithdrawTxHash',
        })
      },

      // 7. Withdraw

      async () => {
        let { secret, ghostScriptValues } = flow.state

        if (!ghostScriptValues) {
          console.error('There is no "ghostScriptValues" in state. No way to continue swap...')
          return
        }

        await flow.ghostSwap.withdraw({
          scriptValues: flow.state.ghostScriptValues,
          secret,
        }, (hash) => {
          flow.setState({
            ghostSwapWithdrawTransactionHash: hash,
          })
        })

        flow.finishStep({
          isGhostWithdrawn: true,
        }, { step: 'withdraw-ghost' })
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
      ownerAddress:       this.app.services.auth.accounts.btc.address,
      participantAddress: participant.btc.address
    }

    return false//this.ghostSwap.checkSwapExists(swapData)
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


  verifyGhostScript() {
    if (this.state.ghostScriptVerified) {
      return true
    }
    if (!this.state.ghostScriptValues) {
      throw new Error(`No script, cannot verify`)
    }

    this.finishStep({
      ghostScriptVerified: true,
    }, { step: 'verify-script' })

    return true
  }

  async syncBalance() {
    const { sellAmount } = this.swap

    this.setState({
      isBalanceFetching: true,
    })

    const balance = await this.btcSwap.fetchBalance(this.app.services.auth.accounts.btc.getAddress())

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
    const { participant } = this.swap

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
        this.swap.room.sendMessage({
          event: 'refund completed',
        })

        this.setState({
          isSwapExist: false,
        })
      })
  }

  async isRefundSuccess() {
    return true
  }

  async tryWithdraw(_secret) {
    const { secret, secretHash, isGhostWithdrawn, isBtcWithdrawn, btcScriptValues } = this.state
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

    const { scriptAddress } = this.ghostSwap.createScript(ghostScriptValues)
    const balance = await this.ghostSwap.getBalance(scriptAddress)

    debug('swap.core:flow')(`address=${scriptAddress}, balance=${balance}`)

    if (balance === 0) {
      this.finishStep({
        isGhostWithdrawn: true,
      }, { step: 'withdraw-ghost' })
      throw new Error(`Already withdrawn: address=${scriptAddress},balance=${balance}`)
    }

    await this.ghostSwap.withdraw({
      scriptValues: ghostScriptValues,
      secret: _secret,
    }, (hash) => {
      debug('swap.core:flow')(`TX hash=${hash}`)
      this.setState({
        ghostSwapWithdrawTransactionHash: hash,
      })
    })
    debug('swap.core:flow')(`TX withdraw sent: ${this.state.ghostSwapWithdrawTransactionHash}`)

    this.finishStep({
      isGhostWithdrawn: true,
    }, { step: 'withdraw-ghost' })
  }

}


export default BTC2GHOST