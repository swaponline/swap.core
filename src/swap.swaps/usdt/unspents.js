const { fetchUnspents } = require('./api')

module.exports = async (address) => {
  const unspents = await fetchUnspents(address)
  const totalUnspent  = unspents.reduce((summ, { satoshis }) => summ + satoshis, 0)

  return { totalUnspent, unspents }
}
