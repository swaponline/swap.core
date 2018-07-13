'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _SwapApp = require('./SwapApp');

var _SwapApp2 = _interopRequireDefault(_SwapApp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ServiceInterface = function () {
  (0, _createClass3.default)(ServiceInterface, [{
    key: '_constructor',


    // _constructor for aggregation
    value: function _constructor() {
      // service name, within it will be stored in SwapApp.services
      this._serviceName = null;
      this._dependsOn = null;
      this._spyHandlers = [];
    }
  }]);

  function ServiceInterface() {
    (0, _classCallCheck3.default)(this, ServiceInterface);

    this._constructor();
  }

  (0, _createClass3.default)(ServiceInterface, [{
    key: '_waitRelationsResolve',
    value: function _waitRelationsResolve() {
      var _this = this;

      if (this._dependsOn && this._dependsOn.length) {
        var dependsOnMap = {};

        this._dependsOn.forEach(function (Service) {
          dependsOnMap[Service.name] = {
            initialized: false
          };

          _SwapApp2.default.services[Service.name]._addWaitRelationHandler(function () {
            dependsOnMap[Service.name].initialized = true;

            var areAllExpectsInitialized = (0, _keys2.default)(dependsOnMap).every(function (serviceName) {
              return dependsOnMap[serviceName].initialized;
            });

            if (areAllExpectsInitialized) {
              _this.initService();
            }
          });
        });
      }
    }
  }, {
    key: '_addWaitRelationHandler',
    value: function _addWaitRelationHandler(handler) {
      this._spyHandlers.push(handler);
    }
  }, {
    key: '_tryInitService',
    value: function _tryInitService() {
      if (!this._dependsOn || !this._dependsOn.length) {
        this.initService();
        this._spyHandlers.forEach(function (handler) {
          return handler();
        });
        this._spyHandlers = [];
      }
    }
  }, {
    key: 'initService',
    value: function initService() {
      // init service on SwapApp mounting
    }
  }]);
  return ServiceInterface;
}();

exports.default = ServiceInterface;
module.exports = exports['default'];