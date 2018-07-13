'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _swap = require('swap.app');

var _swap2 = _interopRequireDefault(_swap);

var _events = require('./events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Order = function () {

  /**
   *
   * @param {object}  parent
   * @param {object}  data
   * @param {string}  data.id
   * @param {object}  data.owner
   * @param {string}  data.owner.peer
   * @param {number}  data.owner.reputation
   * @param {object}  data.owner.<currency>
   * @param {string}  data.owner.<currency>.address
   * @param {string}  data.owner.<currency>.publicKey
   * @param {string}  data.buyCurrency
   * @param {string}  data.sellCurrency
   * @param {number}  data.buyAmount
   * @param {number}  data.sellAmount
   */
  function Order(parent, data) {
    (0, _classCallCheck3.default)(this, Order);

    this.id = data.id;
    this.isMy = null;
    this.owner = null;
    this.participant = null;
    this.buyCurrency = null;
    this.sellCurrency = null;
    this.buyAmount = null;
    this.sellAmount = null;

    this.collection = parent;
    this.requests = []; // income requests
    this.isRequested = false; // outcome request status
    this.isProcessing = false; // if swap isProcessing

    this._update((0, _extends3.default)({}, data, {
      isMy: data.owner.peer === _swap2.default.services.room.peer
    }));

    this._onMount();
  }

  (0, _createClass3.default)(Order, [{
    key: '_onMount',
    value: function _onMount() {
      var _this = this;

      _swap2.default.services.room.on('request swap', function (_ref) {
        var orderId = _ref.orderId,
            participant = _ref.participant;

        if (orderId === _this.id && !_this.requests.find(function (_ref2) {
          var peer = _ref2.peer;
          return peer === participant.peer;
        })) {
          _this.requests.push(participant);

          _events2.default.dispatch('new order request', {
            orderId: orderId,
            participant: participant
          });
        }
      });
    }
  }, {
    key: '_update',
    value: function _update(values) {
      var _this2 = this;

      (0, _keys2.default)(values).forEach(function (key) {
        _this2[key] = values[key];
      });
    }
  }, {
    key: 'update',
    value: function update(values) {
      this._update(values);
      this.collection._saveMyOrders();

      _events2.default.dispatch('swap update', this, values);
    }

    /**
     *
     * @param callback - awaiting for response - accept / decline
     */

  }, {
    key: 'sendRequest',
    value: function sendRequest(callback) {
      var self = this;

      if (_swap2.default.services.room.peer === this.owner.peer) {
        console.warn('You are the owner of this Order. You can\'t send request to yourself.');
        return;
      }

      if (this.isRequested) {
        console.warn('You have already requested this swap.');
        return;
      }

      this.update({
        isRequested: true
      });

      _swap2.default.services.room.sendMessage(this.owner.peer, [{
        event: 'request swap',
        data: {
          orderId: this.id,
          // TODO why do we send this info?
          participant: _swap2.default.services.auth.getPublicData()
        }
      }]);

      _swap2.default.services.room.on('accept swap request', function (_ref3) {
        var orderId = _ref3.orderId;

        if (orderId === self.id) {
          this.unsubscribe();

          self.update({
            isProcessing: true,
            isRequested: false
          });

          callback(true);
        }
      });

      _swap2.default.services.room.on('decline swap request', function (_ref4) {
        var orderId = _ref4.orderId;

        if (orderId === self.id) {
          this.unsubscribe();

          self.update({
            isRequested: false
          });

          // TODO think about preventing user from sent requests every N seconds
          callback(false);
        }
      });
    }
  }, {
    key: 'acceptRequest',
    value: function acceptRequest(participantPeer) {
      var participant = this.requests.find(function (_ref5) {
        var peer = _ref5.peer;
        return peer === participantPeer;
      });

      this.update({
        isRequested: false,
        isProcessing: true,
        participant: participant,
        requests: []
      });

      _swap2.default.services.room.sendMessage(participantPeer, [{
        event: 'accept swap request',
        data: {
          orderId: this.id
        }
      }]);
    }
  }, {
    key: 'declineRequest',
    value: function declineRequest(participantPeer) {
      var index = void 0;

      this.requests.some(function (_ref6, _index) {
        var peer = _ref6.peer;

        if (peer === participantPeer) {
          index = _index;
        }
        return index !== undefined;
      });

      var requests = [].concat((0, _toConsumableArray3.default)(this.requests.slice(0, index)), (0, _toConsumableArray3.default)(this.requests.slice(index + 1)));

      this.update({
        isRequested: false,
        requests: requests
      });

      _swap2.default.services.room.sendMessage(participantPeer, [{
        event: 'decline swap request',
        data: {
          orderId: this.id
        }
      }]);
    }
  }]);
  return Order;
}();

exports.default = Order;
module.exports = exports['default'];