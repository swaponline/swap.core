'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _values = require('babel-runtime/core-js/object/values');

var _values2 = _interopRequireDefault(_values);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _constants = require('./constants');

var _constants2 = _interopRequireDefault(_constants);

var _StorageFactory = require('./StorageFactory');

var _StorageFactory2 = _interopRequireDefault(_StorageFactory);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var SwapApp = function () {
  function SwapApp() {
    (0, _classCallCheck3.default)(this, SwapApp);
  }

  (0, _createClass3.default)(SwapApp, [{
    key: 'setup',


    /**
     *
     * @param {object}  options
     * @param {string}  options.network
     * @param {object}  options.env
     * @param {array}   options.services
     * @param {array}   options.swaps
     * @param {array}   options.flows
     */
    value: function setup(options) {
      this.network = options.network || _constants2.default.NETWORKS.TESTNET;
      this.env = {};
      this.services = {};
      this.swaps = {};
      this.flows = {};

      this._addEnv(options.env || {});
      this._addServices(options.services || {});
      this._addSwaps(options.swaps || {});
      this._addFlows(options.flows || {});
    }

    // Configure -------------------------------------------------------- /

  }, {
    key: '_addEnv',
    value: function _addEnv(env) {
      (0, _keys2.default)(env).forEach(function (name) {
        if ((0, _values2.default)(_constants2.default.ENV).indexOf(name) < 0) {
          throw new Error('SwapApp.addEnv(): Only ' + (0, _values2.default)(_constants2.default.ENV) + ' available');
        }
      });

      this.env = env;
      this.env.storage = new _StorageFactory2.default(env.storage);
    }
  }, {
    key: '_addService',
    value: function _addService(service) {
      if (!service._serviceName) {
        throw new Error('SwapApp service should contain "_serviceName" property');
      }

      if (!(0, _values2.default)(_constants2.default.SERVICES).includes(service._serviceName)) {
        throw new Error('SwapApp service should contain "_serviceName" property should be one of ' + (0, _values2.default)(_constants2.default.SERVICES) + ', got "' + service._serviceName + '"');
      }

      this.services[service._serviceName] = service;
    }
  }, {
    key: '_addServices',
    value: function _addServices(services) {
      var _this = this;

      // add service to app by _serviceName
      services.forEach(function (service) {
        return _this._addService(service);
      });
      // spy expects
      (0, _keys2.default)(this.services).forEach(function (serviceName) {
        return _this.services[serviceName]._waitRelationsResolve();
      });
      // init services
      (0, _keys2.default)(this.services).forEach(function (serviceName) {
        return _this.services[serviceName]._tryInitService();
      });
    }
  }, {
    key: '_addSwap',
    value: function _addSwap(swap) {
      if (!swap._swapName) {
        throw new Error('SwapApp swap should contain "_swapName" property');
      }

      if (!(0, _values2.default)(_constants2.default.COINS).includes(swap._swapName.toUpperCase())) {
        throw new Error('SwapApp swap should contain "_swapName" property should be one of ' + (0, _values2.default)(_constants2.default.COINS) + ', got "' + swap._swapName.toUpperCase() + '"');
      }

      this.swaps[swap._swapName] = swap;

      if (typeof swap._initSwap === 'function') {
        swap._initSwap();
      }
    }
  }, {
    key: '_addSwaps',
    value: function _addSwaps(swaps) {
      var _this2 = this;

      swaps.forEach(function (swap) {
        _this2._addSwap(swap);
      });
    }
  }, {
    key: '_addFlow',
    value: function _addFlow(Flow) {
      var flowName = Flow.getName();

      if (!/^[A-Za-z]+2[A-Za-z]+$/.test(flowName)) {
        throw new Error('SwapApp flow "_flowName" property should be "^[A-Za-z]+2[A-Za-z]+$" format');
      }

      var flowNameLeftPart = flowName.match(/^[^\d]+/);
      var flowNameRightPart = flowName.match(/[^\d]+$/);

      if (!flowNameLeftPart || !flowNameRightPart || !(0, _values2.default)(_constants2.default.COINS).includes(flowNameLeftPart[0].toUpperCase()) || !(0, _values2.default)(_constants2.default.COINS).includes(flowNameRightPart[0].toUpperCase())) {
        throw new Error('SwapApp flow "_flowName" property should contain only: ' + (0, _values2.default)(_constants2.default.COINS) + '. Got: "' + flowName.toUpperCase() + '"');
      }

      this.flows[flowName] = Flow;
    }
  }, {
    key: '_addFlows',
    value: function _addFlows(flows) {
      var _this3 = this;

      flows.forEach(function (flow) {
        _this3._addFlow(flow);
      });
    }

    // Public methods --------------------------------------------------- /

  }, {
    key: 'isMainNet',
    value: function isMainNet() {
      return this.network.toLowerCase() === _constants2.default.NETWORKS.MAINNET;
    }
  }, {
    key: 'isTestNet',
    value: function isTestNet() {
      return this.network.toLowerCase() === _constants2.default.NETWORKS.TESTNET;
    }
  }]);
  return SwapApp;
}();

exports.default = new SwapApp();
module.exports = exports['default'];