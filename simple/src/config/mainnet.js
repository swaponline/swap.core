const bitcoin = require('../instances/bitcoin').mainnet()
const ethereum = require('../instances/ethereum').mainnet()
const tokenSwap = require('./tokenSwap')

const id = parseInt(process.argv[2])
        || process.env.SERVER_ID
        || process.env.ACCOUNT
        || Math.random().toString().slice(2)

const offset = process.env.OFFSET || process.argv[1]
const ROOT_DIR = process.env.ROOT_DIR || '.'

module.exports = {
  id,
  network: 'mainnet',
  storageDir: `${ROOT_DIR}/.storage/${id}`,
  swapRoom: {
    roomName: 'swap.online',
    repo: `${ROOT_DIR}/.ipfs/__mainnet__${id}__/${offset}`,
  },
  ethSwap: () => ({
    address: '0x843FcaAeb0Cce5FFaf272F5F2ddFFf3603F9c2A0',
    abi: [{"constant":false,"inputs":[{"name":"val","type":"uint256"}],"name":"testnetWithdrawn","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_secret","type":"bytes32"},{"name":"_ownerAddress","type":"address"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_participantAddress","type":"address"}],"name":"getSecret","outputs":[{"name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"participantSigns","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"swaps","outputs":[{"name":"secret","type":"bytes32"},{"name":"secretHash","type":"bytes20"},{"name":"createdAt","type":"uint256"},{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_secretHash","type":"bytes20"},{"name":"_participantAddress","type":"address"}],"name":"createSwap","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[],"name":"ratingContractAddress","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_ownerAddress","type":"address"}],"name":"getBalance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_participantAddress","type":"address"}],"name":"refund","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"createdAt","type":"uint256"}],"name":"CreateSwap","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"_secret","type":"bytes32"},{"indexed":false,"name":"addr","type":"address"},{"indexed":false,"name":"amount","type":"uint256"}],"name":"Withdraw","type":"event"},{"anonymous":false,"inputs":[],"name":"Close","type":"event"},{"anonymous":false,"inputs":[],"name":"Refund","type":"event"}],
    fetchBalance: (address) => ethereum.fetchBalance(address),
  }),
  btcSwap: () => ({
    fetchBalance: (address) => bitcoin.fetchBalance(address),
    fetchUnspents: (scriptAddress) => bitcoin.fetchUnspents(scriptAddress),
    broadcastTx: (txRaw) => bitcoin.broadcastTx(txRaw),
  }),
  usdtSwap: () => ({
    fetchBalance: (address) => bitcoin.fetchOmniBalance(address, 31),
    fetchUnspents: (scriptAddress) => bitcoin.fetchUnspents(scriptAddress),
    broadcastTx: (txRaw) => bitcoin.broadcastTx(txRaw),
    fetchTx: hash => bitcoin.fetchTx(hash),
  }),
  noxonTokenSwap: tokenSwap({
    network: 'mainnet',
    name: 'NOXON',
    decimals: 0,
    tokenAddress: '0x9e4ad79049282f942c1b4c9b418f0357a0637017',
  }),
  swapTokenSwap: tokenSwap({
    network: 'mainnet',
    name: 'SWAP',
    decimals: 18,
    tokenAddress: '0x14a52cf6B4F68431bd5D9524E4fcD6F41ce4ADe9',
  })
}
