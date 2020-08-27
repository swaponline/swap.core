const coins = require('./coins');

const tests = [
  {
    check: true,
    coin: 'GHOST',
    network: 'testnet',
    mnemonic: 'praise you muffin lion enable neck grocery crumble super myself license ghost',
    address: 'Xa6SpohTZZAKrbqoZjSFkPY34hbCZJy9RG'
  },
  {
    check: false,
    coin: 'BTC',
    network: 'mainnet',
    mnemonic: 'top title oven vote guitar walnut kind speak bid tuition alert force',
    privateKey: 'L2x6RzgWoyznu93oqZiQtJ1EZDiKCfLREr3izrAtVSmd64LoEL1Z',
    publicKey: '03b16e2ee6024ed5def1d2a1adc709338681df06da25f29069efe7de074ca48587',
    address: '18dUFFBeCLLE1sGUaZvRmF2AGtX8wf2g8j',
  },
]

tests.forEach(test => {
  console.log('Test', test.coin, test.network)
  account = coins[test.coin][test.network].accountFromMnemonic(test.mnemonic)
  const received = account.address.toString()
  const expected = test.address
  if (received == expected) {
    console.log('OK')
  } else {
    console.log('not OK (!!!)')
  }
})