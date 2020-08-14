# How to add BTC-like blockchain


## Edit `swap.core` repo

### Edit files

- `src/swap.app/constants/COINS.js`
- `src/swap.app/constants/COINS_PRECISION.js`
- `src/swap.app/constants/ENV.js`
- `src/swap.app/constants/TRADE_TICKERS.js`
- `src/swap.app/util/typeforce.js`
- `src/swap.auth/ghost.js`
- `src/swap.flows/ETHTOKEN2*.js`
- `src/swap.flows/*2BTC.js` (del?)
- `src/swap.flows/*2ETH.js`
- `src/swap.flows/*2ETHTOKEN.js`
- `src/swap.flows/ETH2*.js`
- `src/swap.flows/index.js`
- `src/swap.swaps/*Swap.js`
- `src/swap.swaps/index.js`
- `package.json` (lib)

`*` = `ghost`, for example

### Example PR (add `ghost`)

- https://github.com/swaponline/swap.core/pull/500
- https://github.com/swaponline/swap.core/pull/501


## Edit `MultiCurrencyWallet` repo

### Edit files

See [instruction](https://github.com/swaponline/MultiCurrencyWallet/blob/master/ADD_BLOCKCHAIN.md)

### Example PR (add `ghost`)

- https://github.com/swaponline/MultiCurrencyWallet/pull/2891




