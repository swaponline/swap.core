# simple swap core

Simplest usage:

```javascript
const swap = require('simple.swap.core')

const { on } = swap.helpers
const { ready } = swap.helpers.room
const { request, subscribe } = swap.helpers.orders
const { onStep, start } = swap.helpers.swap

const doSwap = async order => {
  console.log('new order', order.id)
  if (order.buyAmount > 10) {
    const swap = await request(order)

    console.log('starting swap', swap.flow._flowName, swap.id)

    start(swap)

    await on('finish', swap)

    console.log('finished swap', swap.id)
  }
}

swap.setup().then(async ({ wallet, auth, room, orders }) => {
  const info = await wallet.getBalance()
  console.log('balance:', info)

  await ready(room)
  console.log('info:', wallet.view())

  orders.on('new orders', orders => orders.map(doSwap))
  orders.on('new order', doSwap)
})
```

## Examples

Go to `examples/` directory, then:

```bash
npm i
cp .env.example .env
node bot.js
```

In the `.env`:

- `ROOT_DIR` is where the credentials are stored. If omitted, `.` will be used
- `ACCOUNT` or `SERVER_ID` is the name of the account directory inside `$ROOT_DIR`:

    `$ROOT_DIR/.storage/$ACCOUNT`
    `$ROOT_DIR/.ipfs/$ACCOUNT`

  Will be generated if not given.

- `NETWORK` is one of the `mainnet`, `testnet`, `localnet`. Default = `testnet`
- `OFFSET` is better to be omitted!

 _this variable should be consistent between different scripts if you wish to access the same IPFS peer id. By default `OFFSET` is a `process.argv[1]`, which is usually the name of the script you run: `node bot.js` => `bot.js`, so if you launching the same file, it will match._
