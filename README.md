# Swap Core


## Usage

```js
import Web3 from 'web3'
import bitcoin from 'bitcoinjs-lib'

import SwapApp from 'swap.app'
import SwapAuth from 'swap.auth'
import SwapRoom from 'swap.room'
import SwapOrders from 'swap.orders'
import { EthSwap, EthTokenSwap, BtcSwap } from 'swap.swaps'


const web3 = new Web3(new Web3.providers.HttpProvider('https://rinkeby.infura.io/<YOUR_KEY>'))

SwapApp.setup({
  network: 'testnet',
  env: {
    web3,
    bitcoin,
    Ipfs: window.Ipfs,
    IpfsRoom: window.IpfsRoom,
    storage: window.localStorage,
  },
  services: [
    new SwapAuth({
      eth: null,
      btc: null,
    }),
    new SwapRoom({
      EXPERIMENTAL: {
        pubsub: true,
      },
      config: {
        Addresses: {
          Swarm: [
            '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
          ],
        },
      },
    }),
    new SwapOrders(),
  ],
  swaps: [
    new EthSwap({
      address: '0xe08907e0e010a339646de2cc56926994f58c4db2',
      abi: [ { "constant": false, "inputs": [ { "name": "_ownerAddress", "type": "address" } ], "name": "abort", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "name": "_participantAddress", "type": "address" } ], "name": "close", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "name": "_secretHash", "type": "bytes20" }, { "name": "_participantAddress", "type": "address" } ], "name": "createSwap", "outputs": [], "payable": true, "stateMutability": "payable", "type": "function" }, { "constant": false, "inputs": [ { "name": "_participantAddress", "type": "address" } ], "name": "refund", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "name": "_ratingContractAddress", "type": "address" } ], "name": "setReputationAddress", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "name": "_participantAddress", "type": "address" } ], "name": "sign", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "payable": false, "stateMutability": "nonpayable", "type": "constructor" }, { "constant": false, "inputs": [ { "name": "_secret", "type": "bytes32" }, { "name": "_ownerAddress", "type": "address" } ], "name": "withdraw", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [ { "name": "_ownerAddress", "type": "address" } ], "name": "checkSign", "outputs": [ { "name": "", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "_ownerAddress", "type": "address" }, { "name": "_participantAddress", "type": "address" } ], "name": "getInfo", "outputs": [ { "name": "", "type": "bytes32" }, { "name": "", "type": "bytes20" }, { "name": "", "type": "uint256" }, { "name": "", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "_participantAddress", "type": "address" } ], "name": "getSecret", "outputs": [ { "name": "", "type": "bytes32" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "owner", "outputs": [ { "name": "", "type": "address" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "", "type": "address" }, { "name": "", "type": "address" } ], "name": "participantSigns", "outputs": [ { "name": "", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "ratingContractAddress", "outputs": [ { "name": "", "type": "address" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "", "type": "address" }, { "name": "", "type": "address" } ], "name": "swaps", "outputs": [ { "name": "secret", "type": "bytes32" }, { "name": "secretHash", "type": "bytes20" }, { "name": "createdAt", "type": "uint256" }, { "name": "balance", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "_ownerAddress", "type": "address" }, { "name": "_participantAddress", "type": "address" } ], "name": "unsafeGetSecret", "outputs": [ { "name": "", "type": "bytes32" } ], "payable": false, "stateMutability": "view", "type": "function" } ],
      fetchBalance: (address) => request.fetchEthBalance(address),
    }),
    new EthTokenSwap({
      address: '0x527458d3d3a3af763dbe2ccc5688d64161e81d97',
      abi: [ { "constant": false, "inputs": [ { "name": "_ownerAddress", "type": "address" } ], "name": "abort", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "name": "_participantAddress", "type": "address" } ], "name": "close", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "name": "_secretHash", "type": "bytes20" }, { "name": "_participantAddress", "type": "address" }, { "name": "_value", "type": "uint256" }, { "name": "_token", "type": "address" } ], "name": "createSwap", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "name": "_participantAddress", "type": "address" } ], "name": "refund", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "name": "_ratingContractAddress", "type": "address" } ], "name": "setReputationAddress", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "name": "_participantAddress", "type": "address" } ], "name": "sign", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "payable": false, "stateMutability": "nonpayable", "type": "constructor" }, { "constant": false, "inputs": [ { "name": "_secret", "type": "bytes32" }, { "name": "_ownerAddress", "type": "address" } ], "name": "withdraw", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [ { "name": "_ownerAddress", "type": "address" } ], "name": "checkSign", "outputs": [ { "name": "", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "_ownerAddress", "type": "address" }, { "name": "_participantAddress", "type": "address" } ], "name": "getInfo", "outputs": [ { "name": "", "type": "address" }, { "name": "", "type": "bytes32" }, { "name": "", "type": "bytes20" }, { "name": "", "type": "uint256" }, { "name": "", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "_participantAddress", "type": "address" } ], "name": "getSecret", "outputs": [ { "name": "", "type": "bytes32" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "owner", "outputs": [ { "name": "", "type": "address" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "", "type": "address" }, { "name": "", "type": "address" } ], "name": "participantSigns", "outputs": [ { "name": "", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "ratingContractAddress", "outputs": [ { "name": "", "type": "address" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "", "type": "address" }, { "name": "", "type": "address" } ], "name": "swaps", "outputs": [ { "name": "token", "type": "address" }, { "name": "secret", "type": "bytes32" }, { "name": "secretHash", "type": "bytes20" }, { "name": "createdAt", "type": "uint256" }, { "name": "balance", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "_ownerAddress", "type": "address" }, { "name": "_participantAddress", "type": "address" } ], "name": "unsafeGetSecret", "outputs": [ { "name": "", "type": "bytes32" } ], "payable": false, "stateMutability": "view", "type": "function" } ],
      tokenAddress: '0x60c205722c6c797c725a996cf9cca11291f90749',
      tokenAbi: [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_amount","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_amount","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"getBurnPrice","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"manager","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"unlockEmission","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"emissionlocked","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"acceptOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"lockEmission","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"burnAll","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_newManager","type":"address"}],"name":"changeManager","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_newOwner","type":"address"}],"name":"changeOwner","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_amount","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"emissionPrice","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"addToReserve","outputs":[{"name":"","type":"bool"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[],"name":"burnPrice","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"tokenAddress","type":"address"},{"name":"amount","type":"uint256"}],"name":"transferAnyERC20Token","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"NoxonInit","outputs":[{"name":"","type":"bool"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":false,"inputs":[],"name":"acceptManagership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"buyer","type":"address"},{"indexed":false,"name":"ethers","type":"uint256"},{"indexed":false,"name":"_emissionedPrice","type":"uint256"},{"indexed":false,"name":"amountOfTokens","type":"uint256"}],"name":"TokenBought","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"buyer","type":"address"},{"indexed":false,"name":"ethers","type":"uint256"},{"indexed":false,"name":"_burnedPrice","type":"uint256"},{"indexed":false,"name":"amountOfTokens","type":"uint256"}],"name":"TokenBurned","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"etherReserved","type":"uint256"}],"name":"EtherReserved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_owner","type":"address"},{"indexed":true,"name":"_spender","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Approval","type":"event"}],
      fetchBalance: (address) => request.fetchTokenBalance(address),
    }),
    new BtcSwap({
      fetchBalance: (address) => request.fetchBtcBalance(address),
      fetchUnspents: (scriptAddress) => request.fetchBtcUnspents(scriptAddress),
      broadcastTx: (txRaw) => request.broadcastBtcTx(txRaw),
    }),
  ],
})
```

## [swap.app] SwapApp

#### *SwapApp is singleton!*

#### Configure params

<table>
  <thead style="font-weight: bold;">
    <tr>
      <td>Option</td>
      <td style="min-width: 260px;">Value</td>
      <td>Description</td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>network</td>
      <td><b>'mainnet'</b> or <b>'testnet'</b> (default)</td>
      <td></td>
    </tr>
    <tr>
      <td>env</td>
      <td>Map of environments</td>
      <td>
        Environment for API. Available env names: <b>web3</b>, <b>bitcoin</b>, <b>Ipfs</b> (required),
        <b>IpfsRoom</b> (required), <b>storage</b> (default: window.localStorage) Usage <b>SwapApp.env.{envName}<b>
      </td>
    </tr>
    <tr>
      <td>services</td>
      <td>Array of service instances</td>
      <td>Usage <b>SwapApp.services.{serviceName}</b></td>
    </tr>
    <tr>
      <td>swaps</td>
      <td>Array of swap instances</td>
      <td>All standard swaps stored in <b>swap.swaps</b> package</td>
    </tr>
  </tbody>
</table>

#### Public props

<table>
  <thead style="font-weight: bold;">
    <tr>
      <td>Prop name</td>
      <td>Description</td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>network</td>
      <td></td>
    </tr>
    <tr>
      <td>env</td>
      <td></td>
    </tr>
    <tr>
      <td>services</td>
      <td></td>
    </tr>
    <tr>
      <td>swaps</td>
      <td></td>
    </tr>
  </tbody>
</table>

#### Methods

<table>
  <thead style="font-weight: bold;">
    <tr>
      <td>Method</td>
      <td>Description</td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>isMainNet()</td>
      <td>Returns <b>true</b> if SwapApp.network === 'mainnet'</td>
    </tr>
    <tr>
      <td>isTestNet()</td>
      <td>Returns <b>true</b> if SwapApp.network === 'testnet'</td>
    </tr>
  </tbody>
</table>



## Services


### [swap.auth] SwapApp.services.auth

The service for authentication

```
new SwapAuth({
  eth: null,
  btc: null,
  ...
})
```

You can pass `null` or private key as value. If `null` passed new private key will be created, this key will be saved
in `SwapApp.env.storage` by key `{network}:{coinName}:privateKey` - for network: `testnet` and coin `eth` it will be
`testnet:eth:privateKey`

#### Public props

<table>
  <thead style="font-weight: bold;">
    <tr>
      <td>Prop name</td>
      <td>Description</td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>accounts</td>
      <td></td>
    </tr>
  </tbody>
</table>

#### Methods

<table>
  <thead style="font-weight: bold;">
    <tr>
      <td>Method</td>
      <td>Description</td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>getPublicData()</td>
      <td>Returns <b>{ address, publicKey }</b> for each coin passed on initialization</td>
    </tr>
  </tbody>
</table>



### [swap.room] SwapApp.services.room

Wrapper over [ipfs-pubsub-room](https://github.com/ipfs-shipyard/ipfs-pubsub-room) package.
Only one argument available - config:

```
{
  EXPERIMENTAL: {
    pubsub: true,
  },
  config: {
    Addresses: {
      Swarm: [
        '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
      ],
    },
  },
}
```

#### Public props

<table>
  <thead style="font-weight: bold;">
    <tr>
      <td>Prop name</td>
      <td>Description</td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>peer</td>
      <td>Current user peer</td>
    </tr>
  </tbody>
</table>

#### Methods

<table>
  <thead style="font-weight: bold;">
    <tr>
      <td>Method name</td>
      <td>Description</td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>subscribe(eventName, handler)</td>
      <td></td>
    </tr>
    <tr>
      <td>unsubscribe(eventName, handler)</td>
      <td></td>
    </tr>
    <tr>
      <td>once(eventName, handler)</td>
      <td>Call handler once and unsubscribe</td>
    </tr>
    <tr>
      <td>
<pre>
sendMessage([
  {
    event: 'new order',
    data: {
      order,
    },
  },
  ...
])
</pre>
      </td>
      <td>Accepts array of messages</td>
    </tr>
  </tbody>
</table>


### [swap.orders] SwapApp.services.orders

The service to work with orders

#### Methods

<table>
  <thead style="font-weight: bold;">
    <tr>
      <td>Method</td>
      <td>Description</td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
<pre>
create({
  buyCurrency: 'ETH',
  sellCurrency: 'BTC',
  buyAmount: 10,
  sellAmount: 1,
})
</pre>
      </td>
      <td></td>
    </tr>
    <tr>
      <td>remove(orderId)</td>
      <td></td>
    </tr>
    <tr>
      <td>getMyOrders()</td>
      <td>Get all my orders</td>
    </tr>
    <tr>
      <td>getPeerOrders(peer)</td>
      <td>Get all user's orders by his peer. If user offline returns []</td>
    </tr>
    <tr>
      <td>on(eventName, handler)</td>
      <td>Subscribe for event</td>
    </tr>
    <tr>
      <td>off(eventName, handler)</td>
      <td>Unsubscribe</td>
    </tr>
  </tbody>
</table>

#### Events

<table>
  <thead style="font-weight: bold;">
    <tr>
      <td>Event name</td>
      <td>Description</td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>new orders</td>
      <td>When other user becomes online and send all his orders to other peers</td>
    </tr>
    <tr>
      <td>new order</td>
      <td>When other user creates an order</td>
    </tr>
    <tr>
      <td>remove order</td>
      <td>When other user removes an order</td>
    </tr>
  </tbody>
</table>


---


## Examples

## React

```
cd ./examples/react
npm i
npm start
```

## Vanilla

```
cd ./examples/vanilla
npm i
npm start
```


---


## Flow

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
      <td>1) Wait for sign</td>
      <td>1) Sign</td>
      <td></td>
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


<table>
  <thead style="font-weight: bold;">
    <tr>
      <td></td>
      <td></td>
      <td></td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td></td>
      <td></td>
      <td></td>
    </tr>
  </tbody>
</table>
