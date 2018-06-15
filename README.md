# order-core

https://t.me/swapdev :)

Swap Core

In-browser atomic swap protocol based on HTLC

Try demo at testnet.swap.online

Swap.online is a decentralized exchange protocol (DEP) for crosschain atomic swaps, based on HTLC. It is written on JavaScript and can be run in browser or via NodeJS.

tags: HTLC, atomic swap, javascript, browser, crypto, bitcoin, ethereum, erc20


## Run App example

Run watcher to copy files from `./src` to `./app/src/order`
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

First of all you need to create orderApp. **The specified structure and fields data is required!**

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

// creates new order
app.createOrder(data)
```

```
// returns all orders
app.getOrders()
```

```
// returns only orders created by current user
app.getMyOrders()
```

```
// send request to order owner to start order process
order.sendRequest((isAccepted) => {
  // callback to be invoked when owner will resolve your request
  console.log(`user ${order.owner.peer} ${isAccepted ? 'accepted' : 'declined'} your request`)
})
```

#### Events

```
app.on('ready', () => {
  console.log('orderApp ready')
})

app.on('user online', (peer) => {
  console.log('user online', peer)
})

app.on('user offline', (peer) => {
  console.log('user offline', peer)
})

app.on('new order', (order) => {
  console.log('new order', order)
})

app.on('new order request', ({ orderId, participant }) => {
  console.error(`user ${participant.peer} requesting order`, {
    order: app.orderCollection.getByKey(orderId),
    participant,
  })
})
```


### Order

Each instance of Order class represents order object with own fields and functionality:

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
// send request to this order owner
order.sendRequest()
```

```
// owner accept participant request
order.acceptRequest()
```

```
// owner decline participant request
order.declineRequest()
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
