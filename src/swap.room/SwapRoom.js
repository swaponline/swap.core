import SwapApp, { constants, Events, ServiceInterface } from 'swap.app'


class SwapRoom extends ServiceInterface {

  static get name() {
    return 'room'
  }

  constructor(config) {
    super()

    if (!config || typeof config !== 'object' || typeof config.config !== 'object') {
      throw new Error('SwapRoomService: "config" of type object required')
    }

    this._serviceName   = 'room'
    this._config        = config
    this._events        = new Events()
    this.peer           = null
    this.connection     = null
    this.roomName       = null
  }

  initService() {
    if (!SwapApp.env.Ipfs) {
      throw new Error('SwapRoomService: Ipfs required')
    }
    if (!SwapApp.env.IpfsRoom) {
      throw new Error('SwapRoomService: IpfsRoom required')
    }

    const { roomName, EXPERIMENTAL, ...config } = this._config

    const ipfs = new SwapApp.env.Ipfs({
      EXPERIMENTAL: {
        pubsub: true,
      },
      ...config,
    })

    ipfs.once('error', (err) => {
      console.log('IPFS error!', err)
    })

    ipfs.once('ready', () => ipfs.id((err, info) => {
      console.info('IPFS ready!')

      if (err) {
        throw err
      }

      this._init({
        peer: info.id,
        ipfsConnection: ipfs,
      })
    }))
  }

  _init({ peer, ipfsConnection }) {
    this.peer = peer
    const defaultRoomName = SwapApp.isMainNet()
                  ? 'swap.online'
                  : 'testnet.swap.online'

    this.roomName = this._config.roomName || defaultRoomName

    console.log(`Using room: ${this.roomName}`)

    this.connection = SwapApp.env.IpfsRoom(ipfsConnection, this.roomName, {
      pollInterval: 5000,
    })

    this.connection.on('peer joined', this._handleUserOnline)
    this.connection.on('peer left', this._handleUserOffline)
    this.connection.on('message', this._handleNewMessage)

    this._events.dispatch('ready')
  }

  _handleUserOnline = (peer) => {
    if (peer !== this.peer) {
      this._events.dispatch('user online', peer)
    }
  }

  _handleUserOffline = (peer) => {
    if (peer !== this.peer) {
      this._events.dispatch('user offline', peer)
    }
  }

  _handleNewMessage = (message) => {
    const { from, data } = message

    if (from === this.peer) {
      return
    }

    let parsedData

    try {
      parsedData = JSON.parse(data.toString())
    }
    catch (err) {
      console.error('parse message data err:', err)
    }

    const { fromAddress, messages, sign } = parsedData
    const recover = this._recoverMessage(messages, sign)

    if (recover !== fromAddress || !fromAddress) {
      console.error(`Wrong message sign! Message from: ${fromAddress}, recover: ${recover}`)
      return
    }

    if (messages && messages.length) {
      messages.forEach(({ event, data }) => {
        this._events.dispatch(event, {
          fromPeer: from,
          ...(data || {}),
        })
      })
    }
  }

  on(eventName, handler) {
    this._events.subscribe(eventName, handler)
  }

  off(eventName, handler) {
    this._events.unsubscribe(eventName, handler)
  }

  once(eventName, handler) {
    this._events.once(eventName, handler)
  }

  _recoverMessage(message, sign) {
    const hash = JSON.stringify(message)
    const recover = SwapApp.env.web3.eth.accounts.recover(hash, sign.signature)

    return recover
  }

  async _signMessage(message) {
    const eth = SwapApp.services.auth.accounts.eth

    const msg  = JSON.stringify(message)

    // if no privateKey, then its metamask or truffle
    const account = eth.privateKey || eth.address

    if (eth.privateKey) {
      const hash = msg
      const sign = SwapApp.env.web3.eth.accounts.sign(hash, eth.privateKey)

      return sign
    } else {
      const hash = msg
      // const sign = SwapApp.env.web3.eth.accounts.sign(hash, eth.address)
      const signature = await SwapApp.env.web3.eth.sign(hash, eth.address)

      return { signature }
    }
  }

  async sendMessage(...args) {
    if (args.length === 1) {
      const [ messages ] = args
      const sign = await this._signMessage(messages)

      this.connection.broadcast(JSON.stringify({
        fromAddress: SwapApp.services.auth.accounts.eth.address,
        messages,
        sign,
      }))
    }
    else {
      const [ peer, messages ] = args
      const sign = await this._signMessage(messages)

      this.connection.sendTo(peer, JSON.stringify({
        fromAddress: SwapApp.services.auth.accounts.eth.address,
        messages,
        sign,
      }))
    }
  }
}


export default SwapRoom
