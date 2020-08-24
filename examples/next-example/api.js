const fetch = require('node-fetch');


const APIURL = 'https://testnet.ghostscan.io/ghost-insight-api';


module.exports = {
  async fetchBalance(address) {
    const response = await fetch(`${APIURL}/addr/${address}`);
    const json = await response.json();
    return json;
  },
  async fetchUnspents(address) {
    const response = await fetch(`${APIURL}/addr/${address}/utxo`);
    const json = await response.json();
    return json;
  },
  async fetchTx(txid) {
     const response = await fetch(`${APIURL}/tx/${txid}`);
     const json = await response.json();
     return json;
  },
  async fetchRawTx(txid) {
    const response = await fetch(`${APIURL}/rawtx/${txid}`);
    const json = await response.json();
    return json;
  },
  async publishRawTx(rawTx) {
    const response = await fetch(`${APIURL}/tx/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawtx: rawTx }),
    });
    const json = await response.json();
    return json;
  },
}
