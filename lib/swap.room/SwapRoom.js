'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

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

var _swap = require('swap.app');

var _swap2 = _interopRequireDefault(_swap);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var SwapRoom = function (_ServiceInterface) {
  (0, _inherits3.default)(SwapRoom, _ServiceInterface);
  (0, _createClass3.default)(SwapRoom, null, [{
    key: 'name',
    get: function get() {
      return 'room';
    }
  }]);

  function SwapRoom(config) {
    (0, _classCallCheck3.default)(this, SwapRoom);

    var _this = (0, _possibleConstructorReturn3.default)(this, (SwapRoom.__proto__ || (0, _getPrototypeOf2.default)(SwapRoom)).call(this));

    _this._handleUserOnline = function (peer) {
      if (peer !== _this.peer) {
        _this._events.dispatch('user online', peer);
      }
    };

    _this._handleUserOffline = function (peer) {
      if (peer !== _this.peer) {
        _this._events.dispatch('user offline', peer);
      }
    };

    _this._handleNewMessage = function (message) {
      var from = message.from,
          data = message.data;


      if (from === _this.peer) {
        return;
      }

      var parsedData = void 0;

      try {
        parsedData = JSON.parse(data.toString());
      } catch (err) {
        console.error('parse message data err:', err);
      }

      var _parsedData = parsedData,
          fromAddress = _parsedData.fromAddress,
          messages = _parsedData.messages,
          sign = _parsedData.sign;

      var recover = _this._recoverMessage(messages, sign);

      if (recover !== fromAddress) {
        console.error('Wrong message sign! Message from: ' + fromAddress + ', recover: ' + recover);
        return;
      }

      if (messages && messages.length) {
        messages.forEach(function (_ref) {
          var event = _ref.event,
              data = _ref.data;

          _this._events.dispatch(event, (0, _extends3.default)({
            fromPeer: from
          }, data || {}));
        });
      }
    };

    if (!config || (typeof config === 'undefined' ? 'undefined' : (0, _typeof3.default)(config)) !== 'object') {
      throw new Error('SwapRoomService: "config" of type object required');
    }

    _this._serviceName = 'room';
    _this._config = config;
    _this._events = new _swap.Events();
    _this.peer = null;
    _this.connection = null;
    _this.roomName = null;
    return _this;
  }

  (0, _createClass3.default)(SwapRoom, [{
    key: 'initService',
    value: function initService() {
      var _this2 = this;

      if (!_swap2.default.env.Ipfs) {
        throw new Error('SwapRoomService: Ipfs required');
      }
      if (!_swap2.default.env.IpfsRoom) {
        throw new Error('SwapRoomService: IpfsRoom required');
      }

      var ipfs = new _swap2.default.env.Ipfs(this._config);

      ipfs.once('error', function (err) {
        console.log('IPFS error!', err);
      });

      ipfs.once('ready', function () {
        return ipfs.id(function (err, info) {
          console.info('IPFS ready!');

          if (err) {
            throw err;
          }

          _this2._init({
            peer: info.id,
            ipfsConnection: ipfs
          });
        });
      });
    }
  }, {
    key: '_init',
    value: function _init(_ref2) {
      var peer = _ref2.peer,
          ipfsConnection = _ref2.ipfsConnection;

      this.peer = peer;
      this.roomName = _swap2.default.isMainNet() ? 'swap.online' : 'testnet.swap.online';

      console.log('Using room: ' + this.roomName);

      this.connection = _swap2.default.env.IpfsRoom(ipfsConnection, this.roomName, {
        pollInterval: 5000
      });

      this.connection.on('peer joined', this._handleUserOnline);
      this.connection.on('peer left', this._handleUserOffline);
      this.connection.on('message', this._handleNewMessage);

      this._events.dispatch('ready');
    }
  }, {
    key: 'on',
    value: function on(eventName, handler) {
      this._events.subscribe(eventName, handler);
    }
  }, {
    key: 'off',
    value: function off(eventName, handler) {
      this._events.unsubscribe(eventName, handler);
    }
  }, {
    key: 'once',
    value: function once(eventName, handler) {
      this._events.once(eventName, handler);
    }
  }, {
    key: '_recoverMessage',
    value: function _recoverMessage(message, sign) {
      var hash = _swap2.default.env.web3.utils.soliditySha3((0, _stringify2.default)(message));
      var recover = _swap2.default.env.web3.eth.accounts.recover(hash, sign.signature);

      return recover;
    }
  }, {
    key: '_signMessage',
    value: function _signMessage(message) {
      var hash = _swap2.default.env.web3.utils.soliditySha3((0, _stringify2.default)(message));
      var sign = _swap2.default.env.web3.eth.accounts.sign(hash, _swap2.default.services.auth.accounts.eth.privateKey);

      return sign;
    }
  }, {
    key: 'sendMessage',
    value: function sendMessage() {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      if (args.length === 1) {
        var messages = args[0];

        var sign = this._signMessage(messages);

        this.connection.broadcast((0, _stringify2.default)({
          fromAddress: _swap2.default.services.auth.accounts.eth.address,
          messages: messages,
          sign: sign
        }));
      } else {
        var peer = args[0],
            _messages = args[1];

        var _sign = this._signMessage(_messages);

        this.connection.sendTo(peer, (0, _stringify2.default)({
          fromAddress: _swap2.default.services.auth.accounts.eth.address,
          messages: _messages,
          sign: _sign
        }));
      }
    }
  }]);
  return SwapRoom;
}(_swap.ServiceInterface);

exports.default = SwapRoom;
module.exports = exports['default'];