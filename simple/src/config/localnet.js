const bitcoin = require('../instances/bitcoin').localnet()
const ethereum = require('../instances/ethereum').localnet()
const tokenSwap = require('./tokenSwap')

const id = Math.random().toString().slice(2)

const offset = process.env.OFFSET || Math.random().toString().slice(2)
const ROOT_DIR = process.env.ROOT_DIR || '.'

module.exports = {
  id,
  network: 'localnet',
  storageDir: `${ROOT_DIR}/storage/__localnet__${id}__`,
  swapRoom: {
    roomName: 'localnet.swap.online',
    repo: `${ROOT_DIR}/.ipfs/__localnet__${id}__/${offset}`,
  },
  ethSwap: (contract) => ({
    address: contract.address,
    abi: contract.abi || [{"constant":false,"inputs":[{"name":"val","type":"uint256"}],"name":"testnetWithdrawn","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_secret","type":"bytes32"},{"name":"_ownerAddress","type":"address"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_participantAddress","type":"address"}],"name":"getSecret","outputs":[{"name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"participantSigns","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"swaps","outputs":[{"name":"secret","type":"bytes32"},{"name":"secretHash","type":"bytes20"},{"name":"createdAt","type":"uint256"},{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_secretHash","type":"bytes20"},{"name":"_participantAddress","type":"address"}],"name":"createSwap","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[],"name":"ratingContractAddress","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_ownerAddress","type":"address"}],"name":"getBalance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_participantAddress","type":"address"}],"name":"refund","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"createdAt","type":"uint256"}],"name":"CreateSwap","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"_secret","type":"bytes32"},{"indexed":false,"name":"addr","type":"address"},{"indexed":false,"name":"amount","type":"uint256"}],"name":"Withdraw","type":"event"},{"anonymous":false,"inputs":[],"name":"Close","type":"event"},{"anonymous":false,"inputs":[],"name":"Refund","type":"event"}],
    fetchBalance: (address) => ethereum.fetchEthBalance(address),
    estimateGasPrice: ({ speed } = {}) => ethereum.estimateGasPrice({ speed }),
  }),
  btcSwap: () => ({
    fetchBalance: (address) => bitcoin.fetchBtcBalance(address),
    fetchUnspents: (scriptAddress) => bitcoin.fetchBtcUnspents(scriptAddress),
    broadcastTx: (txRaw) => bitcoin.broadcastBtcTx(txRaw),
    estimateFeeValue: ({ inSatoshis, speed, address, txSize } = {}) => bitcoin.estimateFeeValue({ inSatoshis, speed, address, txSize }),
  }),
  noxonTokenSwap: tokenSwap({
    network: 'localnet',
    name: 'NOXON',
    decimals: 0,
    tokenAddress: '0x60c205722c6c797c725a996cf9cca11291f90749',
  }),
  swapTokenSwap: tokenSwap({
    network: 'localnet',
    name: 'SWAP',
    decimals: 18,
    tokenAddress: '0xbaa3fa2ed111f3e8488c21861ea7b7dbb5a7b121',
  }),
}
