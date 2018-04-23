# swap-core
Swap Core


## Get Started

### App

First of all you need to create swapApp. **The specified structure and fields data is required!**

```
const app = new SwapApp({
  me: {
    reputation: 10,
    eth: {
      address: '0x0',
      publicKey: '0x0',
    },
    btc: {
      address: '0x0',
      publicKey: '0x0',
    },
  },
  ipfsConfig: {
    Addresses: {
      Swarm: [
        '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
      ],
    },
  },
})
```

Then after you create the app you have some functionality:

#### Methods

```
// The specified structure and fields data is required!
const data = {
  buyCurrency: 'ETH',
  sellCurrency: 'BTC',
  buyAmount: 1,
  sellAmount: 0.1,
}

// creates new swap
app.createSwap(data)
```

```
// returns all swaps
app.getSwaps()
```

```
// returns only swaps created by current user
app.getMySwaps()
```

```
// send request to swap owner to start swap process
swap.sendRequest((isAccepted) => {
  // callback to be invoked when owner will resolve your request
  console.log(`user ${swap.owner.peer} ${isAccepted ? 'accepted' : 'declined'} your request`)
})
```

#### Events

```
app.on('ready', () => {
  console.log('swapApp ready')
})

app.on('user online', (peer) => {
  console.log('user online', peer)
})

app.on('user offline', (peer) => {
  console.log('user offline', peer)
})

app.on('new swap', (swap) => {
  console.log('new swap', swap)
})

app.on('new swap request', ({ swapId, participant }) => {
  console.error(`user ${participant.peer} requesting swap`, {
    swap: app.swapCollection.getByKey(swapId),
    participant,
  })
})
```


### Swap

Each instance of Swap class represents swap object with own fields and functionality:

#### Data structure

```
{string}  id
{object}  owner
{string}  owner.peer
{number}  owner.reputation
{object}  owner.<currency>
{string}  owner.<currency>.address
{string}  owner.<currency>.publicKey
{string}  buyCurrency
{string}  sellCurrency
{number}  buyAmount
{number}  sellAmount
{object}  participant
{number}  participant.reputation
{object}  participant.<currency>
{string}  participant.<currency>.address
{string}  participant.<currency>.publicKey
{array}   requests
{boolean} requesting
{boolean} processing
```

#### Methods

```
// updates swap data
swap.update({
  participant: {
    peer: '0x0',
  },
})
```

```
// send request to this swap owner
swap.sendRequest()
```

```
// owner accept participant request
swap.acceptRequest()
```

```
// owner decline participant request
swap.declineRequest()
```
