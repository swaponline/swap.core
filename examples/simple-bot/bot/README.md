# simple-bot


## Settings

```bash
cp .env.example .env
```

Edit `.env`:

- `ROOT_DIR` is where the credentials are stored. If omitted, `.` will be used
- `ACCOUNT` or `SERVER_ID` is the name of the account directory inside `$ROOT_DIR`:

    `$ROOT_DIR/.storage/$ACCOUNT`
    `$ROOT_DIR/.ipfs/$ACCOUNT`

  Will be generated if not given.

- `NETWORK` is one of the `mainnet`, `testnet`. Default = `testnet`
- `OFFSET` is better to be omitted!

 _this variable should be consistent between different scripts if you wish to access the same IPFS peer id. By default `OFFSET` is a `process.argv[1]`, which is usually the name of the script you run: `node bot.js` => `bot.js`, so if you launching the same file, it will match._


## Usage

```bash
node bot.js
```