'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _swap = require('swap.app');

var _swap2 = _interopRequireDefault(_swap);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var EthSwap = function (_SwapInterface) {
  (0, _inherits3.default)(EthSwap, _SwapInterface);

  /**
   *
   * @param {object}    options
   * @param {string}    options.address
   * @param {array}     options.abi
   * @param {number}    options.gasLimit
   * @param {function}  options.fetchBalance
   */
  function EthSwap(options) {
    (0, _classCallCheck3.default)(this, EthSwap);

    var _this = (0, _possibleConstructorReturn3.default)(this, (EthSwap.__proto__ || (0, _getPrototypeOf2.default)(EthSwap)).call(this));

    if (typeof options.fetchBalance !== 'function') {
      throw new Error('EthSwap: "fetchBalance" required');
    }
    if (typeof options.address !== 'string') {
      throw new Error('EthSwap: "address" required');
    }
    if (!Array.isArray(options.abi)) {
      throw new Error('EthSwap: "abi" required');
    }

    _this.address = options.address;
    _this.abi = options.abi;

    _this._swapName = _swap.constants.COINS.eth;
    _this.gasLimit = options.gasLimit || 3e6;
    _this.fetchBalance = options.fetchBalance;
    return _this;
  }

  (0, _createClass3.default)(EthSwap, [{
    key: '_initSwap',
    value: function _initSwap() {
      this.contract = new _swap2.default.env.web3.eth.Contract(this.abi, this.address);
    }

    /**
     *
     * @param {object} data
     * @param {string} data.participantAddress
     * @param {function} handleTransactionHash
     * @returns {Promise}
     */

  }, {
    key: 'sign',
    value: function sign(data, handleTransactionHash) {
      var _this2 = this;

      var participantAddress = data.participantAddress;


      return new _promise2.default(function () {
        var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(resolve, reject) {
          var params, receipt;
          return _regenerator2.default.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  params = {
                    from: _swap2.default.services.auth.accounts.eth.address,
                    gas: _this2.gasLimit
                  };
                  _context.next = 3;
                  return _this2.contract.methods.sign(participantAddress).send(params).on('transactionHash', function (hash) {
                    if (typeof handleTransactionHash === 'function') {
                      handleTransactionHash(hash);
                    }
                  }).on('error', function (err) {
                    reject(err);
                  });

                case 3:
                  receipt = _context.sent;


                  resolve(receipt);

                case 5:
                case 'end':
                  return _context.stop();
              }
            }
          }, _callee, _this2);
        }));

        return function (_x, _x2) {
          return _ref.apply(this, arguments);
        };
      }());
    }

    /**
     *
     * @param {object} data
     * @param {string} data.secretHash
     * @param {string} data.participantAddress
     * @param {number} data.amount
     * @param {function} handleTransactionHash
     * @returns {Promise}
     */

  }, {
    key: 'create',
    value: function create(data, handleTransactionHash) {
      var _this3 = this;

      var secretHash = data.secretHash,
          participantAddress = data.participantAddress,
          amount = data.amount;


      return new _promise2.default(function () {
        var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(resolve, reject) {
          var _contract$methods;

          var hash, params, values, receipt;
          return _regenerator2.default.wrap(function _callee2$(_context2) {
            while (1) {
              switch (_context2.prev = _context2.next) {
                case 0:
                  hash = '0x' + secretHash.replace(/^0x/, '');
                  params = {
                    from: _swap2.default.services.auth.accounts.eth.address,
                    gas: _this3.gasLimit,
                    value: Math.floor(_swap2.default.env.web3.utils.toWei(amount.toString()))
                  };
                  values = [hash, participantAddress];
                  _context2.next = 5;
                  return (_contract$methods = _this3.contract.methods).createSwap.apply(_contract$methods, values).send(params).on('transactionHash', function (hash) {
                    if (typeof handleTransactionHash === 'function') {
                      handleTransactionHash(hash);
                    }
                  }).on('error', function (err) {
                    reject(err);
                  });

                case 5:
                  receipt = _context2.sent;


                  resolve(receipt);

                case 7:
                case 'end':
                  return _context2.stop();
              }
            }
          }, _callee2, _this3);
        }));

        return function (_x3, _x4) {
          return _ref2.apply(this, arguments);
        };
      }());
    }

    /**
     *
     * @param {object} data
     * @param {string} data.ownerAddress
     * @returns {Promise}
     */

  }, {
    key: 'getBalance',
    value: function getBalance(data) {
      var _this4 = this;

      var ownerAddress = data.ownerAddress;


      return new _promise2.default(function () {
        var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(resolve, reject) {
          var balance;
          return _regenerator2.default.wrap(function _callee3$(_context3) {
            while (1) {
              switch (_context3.prev = _context3.next) {
                case 0:
                  balance = void 0;
                  _context3.prev = 1;
                  _context3.next = 4;
                  return _this4.contract.methods.getBalance(ownerAddress).call({
                    from: _swap2.default.services.auth.accounts.eth.address
                  });

                case 4:
                  balance = _context3.sent;
                  _context3.next = 10;
                  break;

                case 7:
                  _context3.prev = 7;
                  _context3.t0 = _context3['catch'](1);

                  reject(_context3.t0);

                case 10:

                  resolve(balance);

                case 11:
                case 'end':
                  return _context3.stop();
              }
            }
          }, _callee3, _this4, [[1, 7]]);
        }));

        return function (_x5, _x6) {
          return _ref3.apply(this, arguments);
        };
      }());
    }

    /**
     *
     * @param {object} data
     * @param {string} data.ownerAddress
     * @param {BigNumber} data.expectedValue
     * @returns {Promise.<string>}
     */

  }, {
    key: 'checkBalance',
    value: function () {
      var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(data) {
        var ownerAddress, expectedValue, balance;
        return _regenerator2.default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                ownerAddress = data.ownerAddress, expectedValue = data.expectedValue;
                _context4.next = 3;
                return this.getBalance({ ownerAddress: ownerAddress });

              case 3:
                balance = _context4.sent;

                if (!expectedValue.isGreaterThan(balance)) {
                  _context4.next = 6;
                  break;
                }

                return _context4.abrupt('return', 'Expected value: ' + expectedValue.toNumber() + ', got: ' + balance);

              case 6:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function checkBalance(_x7) {
        return _ref4.apply(this, arguments);
      }

      return checkBalance;
    }()

    /**
     *
     * @param {object} data
     * @param {string} data.secret
     * @param {string} data.ownerAddress
     * @param {function} handleTransactionHash
     * @returns {Promise}
     */

  }, {
    key: 'withdraw',
    value: function withdraw(data, handleTransactionHash) {
      var _this5 = this;

      var ownerAddress = data.ownerAddress,
          secret = data.secret;


      return new _promise2.default(function () {
        var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(resolve, reject) {
          var _secret, params, receipt;

          return _regenerator2.default.wrap(function _callee5$(_context5) {
            while (1) {
              switch (_context5.prev = _context5.next) {
                case 0:
                  _secret = '0x' + secret.replace(/^0x/, '');
                  params = {
                    from: _swap2.default.services.auth.accounts.eth.address,
                    gas: _this5.gasLimit
                  };
                  _context5.next = 4;
                  return _this5.contract.methods.withdraw(_secret, ownerAddress).send(params).on('transactionHash', function (hash) {
                    if (typeof handleTransactionHash === 'function') {
                      handleTransactionHash(hash);
                    }
                  }).on('error', function (err) {
                    reject(err);
                  });

                case 4:
                  receipt = _context5.sent;


                  resolve(receipt);

                case 6:
                case 'end':
                  return _context5.stop();
              }
            }
          }, _callee5, _this5);
        }));

        return function (_x8, _x9) {
          return _ref5.apply(this, arguments);
        };
      }());
    }

    /**
     *
     * @param {object} data
     * @param {string} data.participantAddress
     * @param {function} handleTransactionHash
     * @returns {Promise}
     */

  }, {
    key: 'refund',
    value: function refund(data, handleTransactionHash) {
      var _this6 = this;

      var participantAddress = data.participantAddress;


      return new _promise2.default(function () {
        var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(resolve, reject) {
          var params, receipt;
          return _regenerator2.default.wrap(function _callee6$(_context6) {
            while (1) {
              switch (_context6.prev = _context6.next) {
                case 0:
                  params = {
                    from: _swap2.default.services.auth.accounts.eth.address,
                    gas: _this6.gasLimit
                  };
                  _context6.next = 3;
                  return _this6.contract.methods.refund(participantAddress).send(params).on('transactionHash', function (hash) {
                    if (typeof handleTransactionHash === 'function') {
                      handleTransactionHash(hash);
                    }
                  }).on('error', function (err) {
                    reject(err);
                  });

                case 3:
                  receipt = _context6.sent;


                  resolve(receipt);

                case 5:
                case 'end':
                  return _context6.stop();
              }
            }
          }, _callee6, _this6);
        }));

        return function (_x10, _x11) {
          return _ref6.apply(this, arguments);
        };
      }());
    }

    /**
     *
     * @param {object} data
     * @param {string} data.participantAddress
     * @returns {Promise}
     */

  }, {
    key: 'getSecret',
    value: function getSecret(data) {
      var _this7 = this;

      var participantAddress = data.participantAddress;


      return new _promise2.default(function () {
        var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7(resolve, reject) {
          var secret, secretValue;
          return _regenerator2.default.wrap(function _callee7$(_context7) {
            while (1) {
              switch (_context7.prev = _context7.next) {
                case 0:
                  _context7.prev = 0;
                  _context7.next = 3;
                  return _this7.contract.methods.getSecret(participantAddress).call({
                    from: _swap2.default.services.auth.accounts.eth.address
                  });

                case 3:
                  secret = _context7.sent;
                  secretValue = secret && !/^0x0+/.test(secret) ? secret : null;


                  resolve(secretValue);
                  _context7.next = 11;
                  break;

                case 8:
                  _context7.prev = 8;
                  _context7.t0 = _context7['catch'](0);

                  reject(_context7.t0);

                case 11:
                case 'end':
                  return _context7.stop();
              }
            }
          }, _callee7, _this7, [[0, 8]]);
        }));

        return function (_x12, _x13) {
          return _ref7.apply(this, arguments);
        };
      }());
    }

    /**
     *
     * @param {object} data
     * @param {string} data.participantAddress
     * @param handleTransactionHash
     * @returns {Promise}
     */

  }, {
    key: 'close',
    value: function close(data, handleTransactionHash) {
      var _this8 = this;

      var participantAddress = data.participantAddress;


      return new _promise2.default(function () {
        var _ref8 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee8(resolve, reject) {
          var params, result;
          return _regenerator2.default.wrap(function _callee8$(_context8) {
            while (1) {
              switch (_context8.prev = _context8.next) {
                case 0:
                  params = {
                    from: _swap2.default.services.auth.accounts.eth.address,
                    gas: _this8.gasLimit
                  };
                  _context8.prev = 1;
                  _context8.next = 4;
                  return _this8.contract.methods.close(participantAddress).send(params).on('transactionHash', function (hash) {
                    if (typeof handleTransactionHash === 'function') {
                      handleTransactionHash(hash);
                    }
                  }).on('error', function (err) {
                    reject(err);
                  });

                case 4:
                  result = _context8.sent;


                  resolve(result);
                  _context8.next = 11;
                  break;

                case 8:
                  _context8.prev = 8;
                  _context8.t0 = _context8['catch'](1);

                  reject(_context8.t0);

                case 11:
                case 'end':
                  return _context8.stop();
              }
            }
          }, _callee8, _this8, [[1, 8]]);
        }));

        return function (_x14, _x15) {
          return _ref8.apply(this, arguments);
        };
      }());
    }
  }]);
  return EthSwap;
}(_swap.SwapInterface);

exports.default = EthSwap;
module.exports = exports['default'];