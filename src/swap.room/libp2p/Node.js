'use strict'

const WebRTCStar = require('libp2p-webrtc-star')
const WebSockets = require('libp2p-websockets')
const WebSocketStar = require('libp2p-websocket-star')
const Mplex = require('libp2p-mplex')
const SPDY = require('libp2p-spdy')
const SECIO = require('libp2p-secio')
const Bootstrap = require('libp2p-bootstrap')
const KadDHT = require('libp2p-kad-dht')
const Gossipsub = require('libp2p-gossipsub')
const libp2p = require('libp2p')

class Node extends libp2p {
  constructor ({ peerInfo }) {
    const wsstar = new WebSocketStar({ id: peerInfo.id })

    const defaults = {
      modules: {
        transport: [
          WebSockets,
          wsstar
        ],
        streamMuxer: [
          Mplex,
          SPDY
        ],
        connEncryption: [
          SECIO
        ],
        peerDiscovery: [
          wsstar.discovery,
        ],
        dht: KadDHT,
        pubsub: Gossipsub
      },
      config: {
        peerDiscovery: {
          autoDial: false,
          websocketStar: {
            enabled: true
          },
        },
        relay: {
          enabled: true,
          hop: {
            enabled: false,
            active: false
          }
        },
        dht: {
          enabled: true,
          kBucketSize: 20
        },
        pubsub: {
          enabled: true,
          emitSelf: false
        }
      },
      connectionManager: {
        minPeers: 10,
        pollInterval: 5000
      },
    }

    super({ ...defaults, peerInfo })
  }
}

module.exports = Node
