import crypto from 'swap-crypto'
import Flow from '../Flow'


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
    const { room, storage } = this.swap
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
        const btcScriptData = this.btcSwap.createScript({
          secretHash:         flow.storage.secretHash,
          btcOwnerPublicKey:  storage.me.btcData.publicKey,
          ethOwnerPublicKey:  storage.participant.btcData.publicKey,
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
        await this.btcSwap.fundScript({
          btcData:  user.btcData,
          script:   flow.storage.btcScriptData.script,
          amount:   storage.requiredAmount,
        })

        room.sendMessage(storage.participant.peer, [
          {
            event: 'swap:btcScriptCreated',
            data: {
              orderId:        storage.id,
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
    const secretHash = crypto.ripemd160(secret)

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
