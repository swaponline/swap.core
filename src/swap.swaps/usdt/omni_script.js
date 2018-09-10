const bitcoin = require('bitcoinjs-lib')

const toPaddedHexString = (num, len) => {
    const str = num.toString(16)
    return "0".repeat(len - str.length) + str
}

module.exports = (amount, coin = 31) => {

  const simple_send = [
    "6f6d6e69", // omni
    "0000",     // version
    // "00000000001f", // 31 for Tether
    toPaddedHexString(coin, 12),
    // "000000003B9ACA00" // amount = 10 * 100 000 000 in HEX
    toPaddedHexString(amount * 100000000, 16),
  ].join('')

  const data = Buffer.from(simple_send, "hex")

  const omniOutput = bitcoin.script.compile([
    bitcoin.opcodes.OP_RETURN,
    // payload for OMNI PROTOCOL:
    data
  ])

  return omniOutput
}
