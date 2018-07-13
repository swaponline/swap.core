'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _COINS = require('./COINS');

var _COINS2 = _interopRequireDefault(_COINS);

var _ENV = require('./ENV');

var _ENV2 = _interopRequireDefault(_ENV);

var _SERVICES = require('./SERVICES');

var _SERVICES2 = _interopRequireDefault(_SERVICES);

var _NETWORKS = require('./NETWORKS');

var _NETWORKS2 = _interopRequireDefault(_NETWORKS);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
  COINS: _COINS2.default,
  ENV: _ENV2.default,
  SERVICES: _SERVICES2.default,
  NETWORKS: _NETWORKS2.default
};
module.exports = exports['default'];