# swap-core
Swap Core


## Run App example

Run watcher to copy files from `./src` to `./app/src/swap`
```
npm run watch
```

Run react-scripts app in additional terminal tab
```
cd ./app
npm start
```


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


# Flow

<table>
  <thead style="font-weight: bold;">
    <tr>
      <td>Alice persist</td>
      <td>Alice <b>BTC -> ETH</b></td>
      <td>Bob <b>ETH -> BTC</b></td>
      <td>Bob persist</td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>EthContract.checkSign()</td>
      <td>1) Sign</td>
      <td>1) Sign</td>
      <td>EthContract.checkSign()</td>
    </tr>
    <tr>
      <td></td>
      <td>2) Create secret hash</td>
      <td rowspan="4">2) Wait for BTC script</td>
      <td rowspan="4">BtcSwap.checkBalance()</td>
    </tr>
    <tr>
      <td></td>
      <td>3) Check balance (if not enough wait until user fill balance on this step)</td>
      <!--td></td-->
      <!--td></td-->
    </tr>
    <tr>
      <td></td>
      <td>4) Create BTC script</td>
      <!--td></td-->
      <!--td></td-->
    </tr>
    <tr>
      <td></td>
      <td>5) Fund BTC script</td>
      <!--td></td-->
      <!--td></td-->
    </tr>
    <tr>
      <td rowspan="3">EthSwap.checkBalance()</td>
      <td rowspan="3">6) Wait for ETH contract</td>
      <td>3) Verify BTC script</td>
      <td></td>
    </tr>
    <tr>
      <!--td></td-->
      <!--td></td-->
      <td>4) Check balance (if not enough wait until user fill balance on this step)</td>
      <td></td>
    </tr>
    <tr>
      <!--td></td-->
      <!--td></td-->
      <td>5) Create ETH contract</td>
      <td></td>
    </tr>
    <tr>
      <td></td>
      <td>7) Withdraw from ETH contract</td>
      <td>6) Wait for withdraw from ETH contract</td>
      <td>EthSwap.getSecret()</td>
    </tr>
    <tr>
      <td></td>
      <td></td>
      <td>7) Withdraw from BTC script</td>
      <td></td>
    </tr>
  </tbody>
</table>
