import Events from './Events'
import { storage } from './Storage'


class Room {

  constructor() {
    this.events   = new Events()
    this.lib      = null
    this.roomLib  = null
  }

  /**
   *
   * @param {object} config
   * @param {function} config.lib
   * @param {array} config.swarm
   */
  init(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Room failed. "config" of type object required.')
    }

    const { lib, roomLib, swarm } = config

    if (!lib || typeof lib !== 'function') {
      throw new Error('Room failed. "lib" of type object required.')
    }
    if (!swarm || !Array.isArray(swarm)) {
      throw new Error('Room failed. "swarm" of type array required.')
    }

    this.lib = lib
    this.roomLib = roomLib

    const ipfs = new this.lib({
      EXPERIMENTAL: {
        pubsub: true,
      },
      Addresses: {
        Swarm: swarm,
      },
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
    storage.me.peer = peer

    this.connection = this.roomLib(ipfsConnection, 'jswaps', {
      pollInterval: 5000,
    })

    this.connection.on('peer joined', this.handleUserOnline)
    this.connection.on('peer left', this.handleUserOffline)
    this.connection.on('message', this.handleNewMessage)

    this.events.dispatch('ready')
  }

  handleUserOnline = (peer) => {
    if (peer !== storage.me.peer) {
      this.events.dispatch('user online', peer)
    }
  }

  handleUserOffline = (peer) => {
    if (peer !== storage.me.peer) {
      this.events.dispatch('user offline', peer)
    }
  }

  handleNewMessage = (message) => {
    if (message.from === storage.me.peer) {
      return
    }

    const data = JSON.parse(message.data.toString())

    if (data && data.length) {
      data.forEach(({ event, data }) => {
        this.events.dispatch(event, { ...(data || {}), fromPeer: message.from })
      })
    }
  }

  subscribe(eventName, handler) {
    this.events.subscribe(eventName, handler)
  }

  once(eventName, handler) {
    this.events.once(eventName, handler)
  }

  sendMessage(...args) {
    if (args.length === 1) {
      const [ message ] = args

      this.connection.broadcast(JSON.stringify(message))
    }
    else {
      const [ peer, message ] = args

      this.connection.sendTo(peer, JSON.stringify(message))
    }
  }
}


export default new Room()
