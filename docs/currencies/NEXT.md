# NEXT (NEXT.coin)

- node/wallet: https://chain.next.exchange/#downloads
- node/wallet src: (on request)
- github: https://github.com/NextExchange
- JS lib: https://github.com/NextExchange/nextcoin-js
- explorer: https://explore.next.exchange/
- rank: https://www.coingecko.com/en/coins/next-coin
- buy: https://next.exchange/


## Address example

XCekEafQLQnvKTXcAfW5uQnnUu9MJkCfqB
XZajSCKFVgXohRsFE9qDUpqzaGqh29mPVF
XWL71yBXn9VtqnzBNFDHxoXzL8RfSdXwcy
XMkvVVvuQJp4mp5hoVHUPumbnvh63xJsN4
XNnXeCcxvPTVFo3DvWERBd6pWZvCfMn9AV
XEQ79EVHWKk9RkhKEnsMQijHiCGmiW42hc


### Address posfixes (???)
XCekEafQLQnvKTXcAfW5uQnnUu9MJkCfqB:POW - nodes
XWL71yBXn9VtqnzBNFDHxoXzL8RfSdXwcy:MN - masternodes


## Public key example

03b0da749730dc9b4b1f4a14d6902877a92541f5368778853d9c4a0cb7802dcfb2


## Script support

yes


## BIP-0044 coin type

707

(https://github.com/satoshilabs/slips/blob/master/slip-0044.md)


## Chain params

see node src: `src/chainparams.cpp`


### Example (ghost chain params)

```
networks.mainnet = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'gp',
  bip32: {
    public:  0x68DF7CBD,
    private: 0x8E8EA8EA,
  },
  pubKeyHash: 0x26,
  scriptHash: 0x61,
  wif: 0xA6,
}

networks.testnet = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'tghost',
  bip32: {
    public: 0xe1427800,
    private: 0x04889478,
  },
  pubKeyHash: 0x4B,
  scriptHash: 0x89,
  wif: 0x2e,
}

```

(Specify NEXT constants)


## Node binaries dist

-nextd
-next-cli
-next-qt


## Node info

mainnet: 7077
testnet: 17077

### Node JSON-RPC

mainnet: 7078
testnet: 17078

----

## `ghost-bitcore-lib` used methods

bitcore.PrivateKey
bitcore.util.buffer
bitcore.Networks.mainnet
bitcore.Networks.testnet
bitcore.Transaction.Sighash.sign()
bitcore.Transaction()...

