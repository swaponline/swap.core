import Flow from '../Flow'


class ETH2BTC extends Flow {

  /*

    Flow storage data:

    {boolean}   secretHash
    {boolean}   checkingBalance
    {boolean}   notEnoughMoney
    {object}    btcScriptData
    {boolean}   btcScriptVerified
    {string}    ethSwapCreationTransactionUrl
    {boolean}   isEthSwapCreated
    {boolean}   isEthWithdrawn
    {string}    btcSwapWithdrawTransactionUrl
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

      // Wait participant create BTC Script

      () => {
        room.subscribe('swap:btcScriptCreated', function ({ orderId, secretHash, btcScriptData }) {
          if (storage.id === orderId) {
            this.unsubscribe()

            flow.finishStep({
              secretHash,
              btcScriptData,
            })
          }
        })
      },

      // Verify BTC Script

      () => {
        this.finishStep({
          btcScriptVerified: true,
        })
      },

      // Check balance

      () => {
        this.syncBalance()
      },

      // Create ETH Contract

      async () => {
        const swapData = {
          myAddress:            storage.me.ethData.address,
          participantAddress:   storage.participant.ethData.address,
          secretHash:           flow.storage.secretHash,
          amount:               storage.requiredAmount,
        }

        await this.ethSwap.create(swapData, (transactionUrl) => {
          this.storage.update({
            ethSwapCreationTransactionUrl: transactionUrl,
          })
        })

        room.sendMessage(storage.participant.peer, [
          {
            event: 'swap:ethSwapCreated',
            data: {
              orderId: storage.id,
            },
          },
        ])

        this.finishStep({
          isEthSwapCreated: true,
        })
      },

      // Wait participant withdraw

      () => {
        room.subscribe('swap:ethWithdrawDone', function ({ orderId }) {
          if (storage.id === orderId) {
            this.unsubscribe()

            flow.finishStep({
              isEthWithdrawn: true,
            })
          }
        })
      },

      // Withdraw

      async () => {
        const myAndParticipantData = {
          myAddress: storage.me.ethData.address,
          participantAddress: storage.participant.ethData.address,
        }

        const secret = await this.ethSwap.getSecret(myAndParticipantData)

        await flow.ethSwap.close(myAndParticipantData)

        const { script } = flow.btcSwap.createScript(flow.storage.btcScriptData)

        await flow.btcSwap.withdraw({
          // TODO here is the problem... now in `btcData` stored bitcoinjs-lib instance with additional functionality
          // TODO need to rewrite this - check instances/bitcoin.js and core/swaps/btcSwap.js:185
          btcData: storage.me.btcData,
          script,
          secret,
        }, (transactionUrl) => {
          flow.storage.update({
            btcSwapWithdrawTransactionUrl: transactionUrl,
          })
        })

        flow.finishStep({
          isWithdrawn: true,
        })
      },

      // Finish

      () => {

      },
    ]
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


export default ETH2BTC
