'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _objectWithoutProperties2 = require('babel-runtime/helpers/objectWithoutProperties');

var _objectWithoutProperties3 = _interopRequireDefault(_objectWithoutProperties2);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _bignumber = require('bignumber.js');

var _bignumber2 = _interopRequireDefault(_bignumber);

var _swap = require('swap.app');

var _swap2 = _interopRequireDefault(_swap);

var _swap3 = require('swap.room');

var _swap4 = _interopRequireDefault(_swap3);

var _aggregation2 = require('./aggregation');

var _aggregation3 = _interopRequireDefault(_aggregation2);

var _events = require('./events');

var _events2 = _interopRequireDefault(_events);

var _Order = require('./Order');

var _Order2 = _interopRequireDefault(_Order);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var getUniqueId = function () {
  var id = Date.now();
  return function () {
    return _swap2.default.services.room.peer + '-' + ++id;
  };
}();

var checkIncomeOrderFormat = function checkIncomeOrderFormat(order) {
  var format = {
    id: '?String',
    owner: (0, _extends3.default)({
      peer: 'String',
      reputation: _swap.util.typeforce.t.maybe(_swap.util.typeforce.isNumeric)
    }, function () {
      var result = {};
      (0, _keys2.default)(_swap.constants.COINS).forEach(function (key) {
        result[key] = _swap.util.typeforce.t.maybe({
          address: _swap.util.typeforce.isCoinAddress[_swap.constants.COINS[key]],
          publicKey: _swap.util.typeforce.isPublicKey[_swap.constants.COINS[key]]
        });
      });
      return result;
    }()),
    buyCurrency: _swap.util.typeforce.isCoinName,
    sellCurrency: _swap.util.typeforce.isCoinName,
    buyAmount: _swap.util.typeforce.isNumeric,
    sellAmount: _swap.util.typeforce.isNumeric,
    exchangeRate: _swap.util.typeforce.t.maybe(_swap.util.typeforce.isNumeric),
    isProcessing: '?Boolean',
    isRequested: '?Boolean'
  };

  var isValid = _swap.util.typeforce.check(format, order, true);

  if (!isValid) {
    console.log('Wrong income order format. Excepted:', format, 'got:', order);
  }

  return isValid;
};

var checkIncomeOrderOwner = function checkIncomeOrderOwner(_ref, fromPeer) {
  var peer = _ref.owner.peer;
  return peer === fromPeer;
};

var checkIncomeOrder = function checkIncomeOrder(order, fromPeer) {
  var isFormatValid = checkIncomeOrderFormat(order);
  var isOwnerValid = checkIncomeOrderOwner(order, fromPeer);

  return isFormatValid && isOwnerValid;
};

var SwapOrders = function (_aggregation) {
  (0, _inherits3.default)(SwapOrders, _aggregation);
  (0, _createClass3.default)(SwapOrders, null, [{
    key: 'name',
    get: function get() {
      return 'orders';
    }
  }]);

  function SwapOrders() {
    (0, _classCallCheck3.default)(this, SwapOrders);

    var _this = (0, _possibleConstructorReturn3.default)(this, (SwapOrders.__proto__ || (0, _getPrototypeOf2.default)(SwapOrders)).call(this));

    _this._handleReady = function () {
      _this._persistMyOrders();
    };

    _this._handleUserOnline = function (peer) {
      var myOrders = _this.getMyOrders();

      if (myOrders.length) {
        // clean orders from other additional props
        myOrders = myOrders.map(function (item) {
          return _swap.util.pullProps(item, 'id', 'owner', 'buyCurrency', 'sellCurrency', 'buyAmount', 'exchangeRate', 'sellAmount', 'isRequested', 'isProcessing');
        });

        _swap2.default.services.room.sendMessage(peer, [{
          event: 'new orders',
          data: {
            orders: myOrders
          }
        }]);
      }
    };

    _this._handleUserOffline = function (peer) {
      var peerOrders = _this.getPeerOrders(peer);

      if (peerOrders.length) {
        peerOrders.forEach(function (_ref2) {
          var id = _ref2.id;

          _this._handleRemove(id);
        });
      }
    };

    _this._handleNewOrders = function (_ref3) {
      var fromPeer = _ref3.fromPeer,
          orders = _ref3.orders;

      // ductape to check if such orders already exist
      var filteredOrders = orders.filter(function (_ref4) {
        var id = _ref4.id,
            peer = _ref4.owner.peer;
        return !_this.getByKey(id) && peer === fromPeer;
      });

      _this._handleMultipleCreate({ orders: filteredOrders, fromPeer: fromPeer });
    };

    _this._handleNewOrder = function (_ref5) {
      var fromPeer = _ref5.fromPeer,
          order = _ref5.order;

      if (order && order.owner && order.owner.peer === fromPeer) {
        if (checkIncomeOrder(order, fromPeer)) {
          _this._handleCreate(order);
        }
      }
    };

    _this._handleRemoveOrder = function (_ref6) {
      var fromPeer = _ref6.fromPeer,
          orderId = _ref6.orderId;

      var order = _this.getByKey(orderId);

      if (order && order.owner && order.owner.peer === fromPeer) {
        _this._handleRemove(orderId);
      }
    };

    _this._serviceName = 'orders';
    _this._dependsOn = [_swap4.default];
    return _this;
  }

  (0, _createClass3.default)(SwapOrders, [{
    key: 'initService',
    value: function initService() {
      _swap2.default.services.room.on('ready', this._handleReady);
      _swap2.default.services.room.on('user online', this._handleUserOnline);
      _swap2.default.services.room.on('user offline', this._handleUserOffline);
      _swap2.default.services.room.on('new orders', this._handleNewOrders);
      _swap2.default.services.room.on('new order', this._handleNewOrder);
      _swap2.default.services.room.on('remove order', this._handleRemoveOrder);
    }
  }, {
    key: '_persistMyOrders',
    value: function _persistMyOrders() {
      var _this2 = this;

      this.getMyOrders().forEach(function (orderData) {
        _this2._handleCreate(orderData);
      });
    }

    /**
     *
     * @param {object} data
     * @param {string} data.id
     * @param {object} data.owner
     * @param {string} data.owner.peer
     * @param {number} data.owner.reputation
     * @param {object} data.owner.<currency>
     * @param {string} data.owner.<currency>.address
     * @param {string} data.owner.<currency>.publicKey
     * @param {string} data.buyCurrency
     * @param {string} data.sellCurrency
     * @param {number} data.buyAmount
     * @param {number} data.sellAmount
     * @param {boolean} data.isProcessing
     * @param {boolean} data.isRequested
     */

  }, {
    key: '_create',
    value: function _create(data) {
      var id = data.id,
          buyAmount = data.buyAmount,
          sellAmount = data.sellAmount,
          buyCurrency = data.buyCurrency,
          sellCurrency = data.sellCurrency,
          rest = (0, _objectWithoutProperties3.default)(data, ['id', 'buyAmount', 'sellAmount', 'buyCurrency', 'sellCurrency']);


      var order = new _Order2.default(this, (0, _extends3.default)({
        id: id || getUniqueId(),
        buyAmount: new _bignumber2.default(String(buyAmount)),
        sellAmount: new _bignumber2.default(String(sellAmount)),
        buyCurrency: buyCurrency.toUpperCase(),
        sellCurrency: sellCurrency.toUpperCase()
      }, rest));

      this.append(order, order.id);

      return order;
    }
  }, {
    key: '_handleCreate',
    value: function _handleCreate(data) {
      var order = this._create(data);

      if (order) {
        _events2.default.dispatch('new order', order);
      }
    }
  }, {
    key: '_handleMultipleCreate',
    value: function _handleMultipleCreate(_ref7) {
      var _this3 = this;

      var orders = _ref7.orders,
          fromPeer = _ref7.fromPeer;

      var newOrders = [];

      orders.forEach(function (data) {
        if (checkIncomeOrder(data, fromPeer)) {
          var order = _this3._create(data);

          newOrders.push(order);
        }
      });

      if (newOrders.length) {
        _events2.default.dispatch('new orders', newOrders);
      }
    }

    /**
     *
     * @param {string} orderId
     */

  }, {
    key: '_handleRemove',
    value: function _handleRemove(orderId) {
      try {
        var order = this.getByKey(orderId);

        if (order) {
          this.removeByKey(orderId);
          _events2.default.dispatch('remove order', order);
        }
      } catch (err) {}
    }
  }, {
    key: '_saveMyOrders',
    value: function _saveMyOrders() {
      var myOrders = this.items.filter(function (_ref8) {
        var peer = _ref8.owner.peer;
        return peer === _swap2.default.services.room.peer;
      });

      // clean orders from other additional props
      // TODO need to add functionality to sync `requests` for users who going offline / online
      // problem: when I going online and persisting my orders need to show only online users requests,
      // but then user comes online need to change status. Ofc we can leave this bcs developers can do this themselves
      // with filters - skip requests where user is offline, but it looks like not very good
      myOrders = myOrders.map(function (item) {
        return _swap.util.pullProps(item, 'id', 'owner', 'buyCurrency', 'sellCurrency', 'buyAmount', 'sellAmount', 'exchangeRate', 'participant', 'requests', 'isRequested', 'isProcessing');
      });

      _swap2.default.env.storage.setItem('myOrders', myOrders);
    }
  }, {
    key: 'getMyOrders',
    value: function getMyOrders() {
      return _swap2.default.env.storage.getItem('myOrders') || [];
    }
  }, {
    key: 'getPeerOrders',
    value: function getPeerOrders(peer) {
      return this.items.filter(function (_ref9) {
        var owner = _ref9.owner;
        return peer === owner.peer;
      });
    }

    /**
     *
     * @param {object} data
     * @param {string} data.buyCurrency
     * @param {string} data.sellCurrency
     * @param {number} data.buyAmount
     * @param {number} data.sellAmount
     */

  }, {
    key: 'create',
    value: function create(data) {
      var order = this._create((0, _extends3.default)({}, data, {
        owner: _swap2.default.services.auth.getPublicData()
      }));
      this._saveMyOrders();

      _swap2.default.services.room.sendMessage([{
        event: 'new order',
        data: {
          order: _swap.util.pullProps(order, 'id', 'owner', 'buyCurrency', 'exchangeRate', 'sellCurrency', 'buyAmount', 'sellAmount', 'isRequested', 'isProcessing')
        }
      }]);
    }

    /**
     *
     * @param {string} orderId
     */

  }, {
    key: 'remove',
    value: function remove(orderId) {
      this.removeByKey(orderId);
      _swap2.default.services.room.sendMessage([{
        event: 'remove order',
        data: {
          orderId: orderId
        }
      }]);
      this._saveMyOrders();
    }
  }, {
    key: 'on',
    value: function on(eventName, handler) {
      _events2.default.subscribe(eventName, handler);
      return this;
    }
  }, {
    key: 'off',
    value: function off(eventName, handler) {
      _events2.default.unsubscribe(eventName, handler);
      return this;
    }
  }]);
  return SwapOrders;
}((0, _aggregation3.default)(_swap.ServiceInterface, _swap.Collection));

exports.default = SwapOrders;
module.exports = exports['default'];