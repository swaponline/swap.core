import crypto from 'bitcoinjs-lib/src/crypto' // move to BtcSwap
import SwapApp, { constants } from 'swap.app'
import { Flow } from 'swap.swap'


class ETH2BCH extends Flow {

  static getName() {
    return `${constants.COINS.eth}2${constants.COINS.bch}`
  }

  constructor(swap) {
    super(swap)

    this._flowName = ETH2BCH.getName()

    this.ethSwap = SwapApp.swaps[constants.COINS.eth]
    this.bchSwap = SwapApp.swaps[constants.COINS.bch]

    this.myBtcAddress = SwapApp.services.auth.accounts.btc.getAddress()
    this.myEthAddress = SwapApp.services.auth.accounts.eth.address

    this.stepNumbers = {
      'sign': 1,
      'wait-lock-bch': 2,
      'verify-script': 3,
      'sync-balance': 4,
      'lock-eth': 5,
      'wait-withdraw-eth': 6, // aka getSecret
      'withdraw-bch': 7,
      'finish': 8,
      'end': 9
    }

    if (!this.ethSwap) {
      throw new Error('ETH2BCH: "ethSwap" of type object required')
    }
    if (!this.bchSwap) {
      throw new Error('ETH2BCH: "bchSwap" of type object required')
    }

    this.state = {
      step: 0,

      signTransactionHash: null,
      isSignFetching: false,
      isMeSigned: false,

      secretHash: null,
      bchScriptValues: null,

      bchScriptVerified: false,

      isBalanceFetching: false,
      isBalanceEnough: false,
      balance: null,

      bchScriptCreatingTransactionHash: null,
      ethSwapCreationTransactionHash: null,

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

      // 2. Wait participant create, fund BCH Script

      () => {
        flow.swap.room.once('create bch script', ({ scriptValues, bchScriptCreatingTransactionHash }) => {
          flow.finishStep({
            secretHash: scriptValues.secretHash,
            bchScriptValues: scriptValues,
            bchScriptCreatingTransactionHash,
          }, { step: 'wait-lock-bch', silentError: true })
        })

        flow.swap.room.sendMessage({
          event: 'request bch script',
        })
      },

      // 3. Verify BCH Script

      () => {
        console.log(`waiting verify bch script`)
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

        const scriptCheckResult = await flow.bchSwap.checkScript(flow.state.bchScriptValues, {
          value: buyAmount,
          recipientPublicKey: SwapApp.services.auth.accounts.btc.getPublicKey(),
          lockTime: getLockTime(),
        })

        if (scriptCheckResult) {
          console.error(`Btc script check error:`, scriptCheckResult)
          flow.swap.events.dispatch('bch script check error', scriptCheckResult)
          return
        }

        const swapData = {
          participantAddress:   participant.eth.address,
          secretHash:           flow.state.secretHash,
          amount:               sellAmount,
        }

        try {
          await this.ethSwap.create(swapData, (hash) => {
            flow.swap.room.sendMessage({
              event: 'create eth contract',
              data: {
                ethSwapCreationTransactionHash: hash,
              },
            })

            flow.setState({
              ethSwapCreationTransactionHash: hash,
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

        console.log(`finish step`)

        flow.finishStep({
          isEthContractFunded: true,
        }, { step: 'lock-eth' })
      },

      // 6. Wait participant withdraw

      () => {
        flow.swap.room.once('ethWithdrawTxHash', async ({ ethSwapWithdrawTransactionHash }) => {
          flow.setState({
            ethSwapWithdrawTransactionHash,
          })

          const secret = await flow.ethSwap.getSecretFromTxhash(ethSwapWithdrawTransactionHash)

          if (!flow.state.isEthWithdrawn && secret) {
            flow.finishStep({
              isEthWithdrawn: true,
              secret,
            }, { step: 'wait-withdraw-eth' })
          }
        })

        flow.swap.room.sendMessage({
          event: 'request ethWithdrawTxHash',
        })


      },

      // 7. Withdraw

      async () => {
        let { secret, bchScriptValues } = flow.state

        if (!bchScriptValues) {
          console.error('There is no "bchScriptValues" in state. No way to continue swap...')
          return
        }

        await flow.bchSwap.withdraw({
          scriptValues: flow.state.bchScriptValues,
          secret,
        }, (hash) => {
          flow.setState({
            bchSwapWithdrawTransactionHash: hash,
          })
        })

        flow.finishStep({
          isBtcWithdrawn: true,
        }, { step: 'withdraw-bch' })
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
      ownerAddress:       SwapApp.services.auth.accounts.eth.address,
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

      this.swap.room.once('request sign', () => {
        this.swap.room.sendMessage({
          event: 'swap sign',
        })

        this.finishStep({
          isMeSigned: true,
        }, { step: 'sign' })
      })

      return true
    }
  }


  verifyBtcScript(_minFee = 500) {
    const { bchScriptValues, bchScriptVerified } = this.state

    if (bchScriptVerified) return true

    if (!bchScriptValues) {
      throw new Error(`No script, cannot verify`)
    }

    this.finishStep({
      bchScriptVerified: true,
    }, { step: 'verify-script' })

    return true
  }

  async syncBalance() {
    const { sellAmount } = this.swap

    this.setState({
      isBalanceFetching: true,
    })

    const balance = await this.ethSwap.fetchBalance(SwapApp.services.auth.accounts.eth.address)
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

  async tryWithdraw(_secret) {
    const { secret, secretHash, isEthWithdrawn, isBtcWithdrawn, bchScriptValues } = this.state

    if (!_secret)
      throw new Error(`Withdrawal is automatic. For manual withdrawal, provide a secret`)

    if (!bchScriptValues)
      throw new Error(`Cannot withdraw without script values`)

    if (secret && secret != _secret)
      console.warn(`Secret already known and is different. Are you sure?`)

    if (isBtcWithdrawn)
      console.warn(`Looks like money were already withdrawn, are you sure?`)

    console.log(`WITHDRAW using secret = ${_secret}`)

    const _secretHash = crypto.ripemd160(Buffer.from(_secret, 'hex')).toString('hex')

    if (secretHash != _secretHash)
      console.warn(`Hash does not match!`)

    const { scriptAddress } = this.bchSwap.createScript(bchScriptValues)

    const balance = await this.bchSwap.getBalance(scriptAddress)

    console.log(`address=${scriptAddress}, balance=${balance}`)

    if (balance === 0) {
      flow.finishStep({
        isBtcWithdrawn: true,
      }, { step: 'withdraw-bch' })

      throw new Error(`Already withdrawn: address=${scriptAddress},balance=${balance}`)
    }

    await this.bchSwap.withdraw({
      scriptValues: bchScriptValues,
      secret: _secret,
    }, (hash) => {
      console.log(`TX hash=${hash}`)
      this.setState({
        bchSwapWithdrawTransactionHash: hash,
      })
    })

    console.log(`TX withdraw sent: ${this.state.bchSwapWithdrawTransactionHash}`)

    this.finishStep({
      isBtcWithdrawn: true,
    }, { step: 'withdraw-bch' })
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
}


export default ETH2BCH
