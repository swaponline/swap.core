'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _swap = require('swap.app');

var _swap2 = _interopRequireDefault(_swap);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var login = function login(_privateKey) {
  var storageKey = _swap2.default.network + ':btc:privateKey';
  var privateKey = _privateKey || _swap2.default.env.storage.getItem(storageKey);
  var account = void 0;

  var network = _swap2.default.isMainNet() ? _swap2.default.env.bitcoin.networks.bitcoin : _swap2.default.env.bitcoin.networks.testnet;

  if (!privateKey) {
    privateKey = _swap2.default.env.bitcoin.ECPair.makeRandom({ network: network }).toWIF();
  }

  account = new _swap2.default.env.bitcoin.ECPair.fromWIF(privateKey, network);

  account.__proto__.getPublicKey = function () {
    return account.getPublicKeyBuffer().toString('hex');
  };
  account.__proto__.getPrivateKey = function () {
    return privateKey;
  };

  if (!_privateKey) {
    _swap2.default.env.storage.setItem(storageKey, privateKey);
  }

  return account;
};

var getPublicData = function getPublicData(account) {
  return {
    address: account.getAddress(),
    publicKey: account.getPublicKey()
  };
};

exports.default = {
  login: login,
  getPublicData: getPublicData
};
module.exports = exports['default'];