'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var StorageFactory = function () {
  function StorageFactory(storage) {
    (0, _classCallCheck3.default)(this, StorageFactory);

    this.prefix = 'swap:';
    this.storage = storage || global.localStorage;

    try {
      this.storage.setItem('test', 'test');
      this.storage.getItem('test');
      this.storage.removeItem('test');
    } catch (err) {
      throw new Error('SwapApp.env.StorageFactory: ' + err);
    }
  }

  (0, _createClass3.default)(StorageFactory, [{
    key: 'setItem',
    value: function setItem(key, value) {
      this.storage.setItem('' + this.prefix + key, (0, _stringify2.default)(value));
    }
  }, {
    key: 'getItem',
    value: function getItem(key) {
      var value = this.storage.getItem('' + this.prefix + key);

      try {
        return JSON.parse(value);
      } catch (err) {
        console.error('SwapApp.env.storage.getItem(' + key + ') parse error. Looks like the value was created w/o setItem method');
        console.error(err);
        return undefined;
      }
    }
  }, {
    key: 'removeItem',
    value: function removeItem(key) {
      return this.storage.removeItem('' + this.prefix + key);
    }
  }]);
  return StorageFactory;
}();

exports.default = StorageFactory;
module.exports = exports['default'];