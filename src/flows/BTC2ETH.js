import crypto from 'bitcoinjs-lib/src/crypto'
import Flow from '../Flow'
import { storage } from '../Storage'
import room from '../room'


class BTC2ETH extends Flow {

  /*

    Flow storage data:

    {string}    secret
    {string}    secretHash
    {boolean}   checkingBalance
    {boolean}   notEnoughMoney
    {object}    btcScriptData
    {boolean}   isBtcScriptFunded
    {boolean}   isEthSwapCreated
    {string}    ethSwapWithdrawTransactionUrl
    {boolean}   isWithdrawn

   */

  constructor({ swap, data, options: { ethSwap, btcSwap, syncData, getBalance } }) {
    super({ swap, data, options: { ethSwap, syncData } })

    if (!ethSwap) {
      throw new Error('BTC2ETH failed. "ethSwap" of type object required.')
    }
    if (!btcSwap) {
      throw new Error('BTC2ETH failed. "btcSwap" of type object required.')
    }
    if (typeof getBalance !== 'function') {
      throw new Error('BTC2ETH failed. "getBalance" of type function required.')
    }

    this.swap       = swap
    this.ethSwap    = ethSwap
    this.btcSwap    = btcSwap
    this.getBalance = getBalance

    this._persist()
  }

  _getSteps() {
    const flow = this

    return [

      // Create secret, secret hash

      () => {},

      // Check balance

      () => {
        this.syncBalance()
      },

      // Create BTC Script

      () => {
        const { participant } = this.swap

        const btcScriptData = this.btcSwap.createScript({
          secretHash:         flow.storage.secretHash,
          btcOwnerPublicKey:  storage.me.btcData.publicKey,
          ethOwnerPublicKey:  participant.btcData.publicKey,
        })

        // Timeout to show dumb loader - like smth is going
        setTimeout(() => {
          flow.finishStep({
            btcScriptData,
          })
        }, 1500)
      },

      // Fund BTC Script, notify participant

      async () => {
        const { id, sellAmount, participant } = this.swap

        await this.btcSwap.fundScript({
          btcData:  storage.me.btcData,
          script:   flow.storage.btcScriptData.script,
          amount:   sellAmount,
        })

        room.sendMessage(participant.peer, [
          {
            event: 'swap:btcScriptCreated',
            data: {
              orderId:        id,
              secretHash:     flow.storage.secretHash,
              btcScriptData:  flow.storage.btcScriptData,
            },
          },
        ])

        flow.finishStep({
          isBtcScriptFunded: true,
        })
      },

      // Wait participant creates ETH Contract

      () => {
        room.subscribe('swap:ethSwapCreated', function ({ orderId }) {
          if (storage.id === orderId) {
            this.unsubscribe()

            flow.finishStep({
              isEthSwapCreated: true,
            })
          }
        })
      },

      // Withdraw

      async () => {
        const data = {
          myAddress:      storage.me.ethData.address,
          ownerAddress:   storage.participant.ethData.address,
          secret:         flow.storage.secret,
        }

        await this.ethSwap.withdraw(data, (transactionHash) => {
          flow.storage.update({
            ethSwapWithdrawTransactionUrl: transactionHash,
          })
        })

        room.sendMessage(storage.participant.peer, [
          {
            event: 'swap:ethWithdrawDone',
            data: {
              orderId: storage.id,
            },
          },
        ])

        flow.finishStep({
          isWithdrawn: true,
        })
      },

      // Finish

      () => {

      },
    ]
  }

  submitSecret(secret) {
    const secretHash = crypto.ripemd160(Buffer.from(secret, 'hex')).toString('hex')

    this.finishStep({
      secret,
      secretHash,
    })
  }

  async syncBalance() {
    const { storage } = this.swap

    this.storage.update({
      checkingBalance: true,
    })

    const balance = await this.getBalance()
    const isEnoughMoney = storage.requiredAmount <= balance

    if (isEnoughMoney) {
      this.finishStep({
        checkingBalance: false,
        notEnoughMoney: false,
      })
    }
    else {
      this.storage.update({
        checkingBalance: false,
        notEnoughMoney: true,
      })
    }
  }
}


export default BTC2ETH
