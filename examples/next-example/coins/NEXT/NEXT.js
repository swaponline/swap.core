const { networkType } = require('./../../domain/network')

const NEXT = {
  networks: {
    'mainnet': {
      type: networkType.mainnet,
      bip32settings: {
        messagePrefix: '\x18Bitcoin Signed Message:\n',
        bech32: 'bc', // todo: set right value
        bip32: {
          public: 0x0488B21E,
          private: 0x0488ADE4,
        },
        pubKeyHash: 0x6f, // todo: set right value
        scriptHash: 0xc4, // todo: set right value
        wif: 0xef, // todo: set right value
      },
      bip44coinIndex: 707,
    },
    /*
    'testnet': { //testnet is down???
      type: networkType.testnet,
      bip32settings: {
        messagePrefix: '\x18Bitcoin Signed Message:\n',
        bech32: ,
        bip32: {
          public: 0x043587CF,
          private: 0x04358394,
        },
        pubKeyHash: ,
        scriptHash: ,
        wif: ,
      },
      bip44coinIndex: 1,
    }
    */
  }
}

module.exports = NEXT


/*
{
  addrStr: 'XPtT4tJWyepGAGRF9DR4AhRkJWB3DEBXT2',
  balance: 0,
  balanceSat: 0,
  totalReceived: 1,
  totalReceivedSat: 100000000,
  totalSent: 1,
  totalSentSat: 100000000,
  unconfirmedBalance: 7,
  unconfirmedBalanceSat: 700000000,
  unconfirmedTxApperances: 7,
  txApperances: 2,
  transactions: [
    '66dd34435ecc09727c715b9b8564ac9830332acdcda283b92c084c640f7dec26',
    'd4817ba9cb3a9be673ea63b1d8c17040c60d190da5a2511152cf1aa6495d4f46',
    'fff5b4b4b17e63da4240a8020ec51c175e6f97a7b6da3b52e3a3ef132bf75385',
    'a0b2c19770a855771f5757f73586584ffdf99845f8265dcf16d17438ecf3d331',
    '1af126d9f6c8da588c8d5db8956ecdd3d0163f6564b6d1a6bb2c644b792dd404',
    '466aff0ffd8681776190bf95e242f5bae8763948d182e77aec68ee05fa165b62',
    '99a7ffcd12252b4e4c11b5cd76256fa3aa357f0202b13a5e168ca217fa609965',
    '6250c6771e9972506b82ae466b375dd06cc2cc5b5dcdae7121d542187dc45614',
    '14039d3e24d17b51b6dcefdae07fd17b142eefcaaa1ae2039dcf05717bc147a3'
  ]
}
*/