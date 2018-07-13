'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

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

var _get2 = require('babel-runtime/helpers/get');

var _get3 = _interopRequireDefault(_get2);

var _swap = require('swap.app');

var _swap2 = _interopRequireDefault(_swap);

var _swap3 = require('swap.swap');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (tokenName) {
  var ETHTOKEN2BTC = function (_Flow) {
    (0, _inherits3.default)(ETHTOKEN2BTC, _Flow);
    (0, _createClass3.default)(ETHTOKEN2BTC, null, [{
      key: 'getName',
      value: function getName() {
        return tokenName.toUpperCase() + '2' + _swap.constants.COINS.btc;
      }
    }]);

    function ETHTOKEN2BTC(swap) {
      (0, _classCallCheck3.default)(this, ETHTOKEN2BTC);

      var _this = (0, _possibleConstructorReturn3.default)(this, (ETHTOKEN2BTC.__proto__ || (0, _getPrototypeOf2.default)(ETHTOKEN2BTC)).call(this, swap));

      _this._flowName = ETHTOKEN2BTC.getName();

      _this.ethTokenSwap = _swap2.default.swaps[tokenName.toUpperCase()];
      _this.btcSwap = _swap2.default.swaps[_swap.constants.COINS.btc];

      if (!_this.ethTokenSwap) {
        throw new Error('ETHTOKEN2BTC: "ethTokenSwap" of type object required');
      }
      if (!_this.btcSwap) {
        throw new Error('ETHTOKEN2BTC: "btcSwap" of type object required');
      }

      _this.state = {
        step: 0,

        signTransactionHash: null,
        isSignFetching: false,
        isMeSigned: false,

        secretHash: null,
        btcScriptValues: null,

        btcScriptVerified: false,

        isBalanceFetching: false,
        isBalanceEnough: false,
        balance: null,

        ethSwapCreationTransactionHash: null,
        isEthContractFunded: false,

        secret: null,
        isEthClosed: false,

        isEthWithdrawn: false,
        isBtcWithdrawn: false,

        refundTransactionHash: null
      };

      (0, _get3.default)(ETHTOKEN2BTC.prototype.__proto__ || (0, _getPrototypeOf2.default)(ETHTOKEN2BTC.prototype), '_persistSteps', _this).call(_this);
      _this._persistState();
      return _this;
    }

    (0, _createClass3.default)(ETHTOKEN2BTC, [{
      key: '_persistState',
      value: function _persistState() {
        (0, _get3.default)(ETHTOKEN2BTC.prototype.__proto__ || (0, _getPrototypeOf2.default)(ETHTOKEN2BTC.prototype), '_persistState', this).call(this);
      }
    }, {
      key: '_getSteps',
      value: function _getSteps() {
        var _this2 = this;

        var flow = this;

        return [

        // 1. Sign swap to start

        function () {
          // this.sign()
        },

        // 2. Wait participant create, fund BTC Script

        function () {
          flow.swap.room.once('create btc script', function (_ref) {
            var scriptValues = _ref.scriptValues;

            flow.finishStep({
              secretHash: scriptValues.secretHash,
              btcScriptValues: scriptValues
            });
          });
        },

        // 3. Verify BTC Script

        function () {
          // this.verifyBtcScript()
        },

        // 4. Check balance

        function () {
          _this2.syncBalance();
        },

        // 5. Create ETH Contract

        (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
          var _flow$swap, participant, buyAmount, sellAmount, utcNow, getLockTime, scriptCheckResult, swapData;

          return _regenerator2.default.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  _flow$swap = flow.swap, participant = _flow$swap.participant, buyAmount = _flow$swap.buyAmount, sellAmount = _flow$swap.sellAmount;

                  // TODO move this somewhere!

                  utcNow = function utcNow() {
                    return Math.floor(Date.now() / 1000);
                  };

                  getLockTime = function getLockTime() {
                    return utcNow() + 3600 * 1;
                  }; // 1 hour from now

                  _context.next = 5;
                  return flow.btcSwap.checkScript(flow.state.btcScriptValues, {
                    value: buyAmount,
                    recipientPublicKey: _swap2.default.services.auth.accounts.btc.getPublicKey(),
                    lockTime: getLockTime()
                  });

                case 5:
                  scriptCheckResult = _context.sent;

                  if (!scriptCheckResult) {
                    _context.next = 10;
                    break;
                  }

                  console.error('Btc script check error:', scriptCheckResult);
                  flow.swap.events.dispatch('btc script check error', scriptCheckResult);
                  return _context.abrupt('return');

                case 10:
                  swapData = {
                    participantAddress: participant.eth.address,
                    secretHash: flow.state.secretHash,
                    amount: sellAmount
                  };
                  _context.next = 13;
                  return flow.ethTokenSwap.approve({
                    amount: sellAmount
                  });

                case 13:
                  _context.next = 15;
                  return flow.ethTokenSwap.create(swapData, function (hash) {
                    flow.setState({
                      ethSwapCreationTransactionHash: hash
                    });
                  });

                case 15:

                  flow.swap.room.sendMessage('create eth contract');

                  flow.finishStep({
                    isEthContractFunded: true
                  });

                case 17:
                case 'end':
                  return _context.stop();
              }
            }
          }, _callee, _this2);
        })),

        // 6. Wait participant withdraw

        function () {
          var participant = flow.swap.participant;

          var timer = void 0;

          var checkSecretExist = function checkSecretExist() {
            timer = setTimeout((0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2() {
              var secret;
              return _regenerator2.default.wrap(function _callee2$(_context2) {
                while (1) {
                  switch (_context2.prev = _context2.next) {
                    case 0:
                      secret = void 0;
                      _context2.prev = 1;
                      _context2.next = 4;
                      return flow.ethTokenSwap.getSecret({
                        participantAddress: participant.eth.address
                      });

                    case 4:
                      secret = _context2.sent;
                      _context2.next = 9;
                      break;

                    case 7:
                      _context2.prev = 7;
                      _context2.t0 = _context2['catch'](1);

                    case 9:

                      if (secret) {
                        if (!flow.state.isEthWithdrawn) {
                          // redundant condition but who cares :D
                          flow.finishStep({
                            isEthWithdrawn: true,
                            secret: secret
                          });
                        }
                      } else {
                        checkSecretExist();
                      }

                    case 10:
                    case 'end':
                      return _context2.stop();
                  }
                }
              }, _callee2, _this2, [[1, 7]]);
            })), 20 * 1000);
          };

          checkSecretExist();

          flow.swap.room.once('finish eth withdraw', function () {
            if (!flow.state.isEthWithdrawn) {
              clearTimeout(timer);
              timer = null;

              flow.finishStep({
                isEthWithdrawn: true
              });
            }
          });
        },

        // 7. Withdraw

        (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3() {
          var participant, _flow$state, secret, isEthClosed, data;

          return _regenerator2.default.wrap(function _callee3$(_context3) {
            while (1) {
              switch (_context3.prev = _context3.next) {
                case 0:
                  participant = flow.swap.participant;
                  _flow$state = flow.state, secret = _flow$state.secret, isEthClosed = _flow$state.isEthClosed;
                  data = {
                    participantAddress: participant.eth.address

                    // if there is no secret in state then request it
                  };

                  if (secret) {
                    _context3.next = 15;
                    break;
                  }

                  _context3.prev = 4;
                  _context3.next = 7;
                  return flow.ethTokenSwap.getSecret(data);

                case 7:
                  secret = _context3.sent;


                  flow.setState({
                    secret: secret
                  });
                  _context3.next = 15;
                  break;

                case 11:
                  _context3.prev = 11;
                  _context3.t0 = _context3['catch'](4);

                  // TODO notify user that smth goes wrong
                  console.error(_context3.t0);
                  return _context3.abrupt('return');

                case 15:
                  if (secret) {
                    _context3.next = 18;
                    break;
                  }

                  console.error('Secret required! Got ' + secret);
                  return _context3.abrupt('return');

                case 18:
                  if (isEthClosed) {
                    _context3.next = 29;
                    break;
                  }

                  _context3.prev = 19;
                  _context3.next = 22;
                  return flow.ethTokenSwap.close(data);

                case 22:

                  flow.setState({
                    isEthClosed: true
                  });
                  _context3.next = 29;
                  break;

                case 25:
                  _context3.prev = 25;
                  _context3.t1 = _context3['catch'](19);

                  // TODO notify user that smth goes wrong
                  console.error(_context3.t1);
                  return _context3.abrupt('return');

                case 29:
                  _context3.next = 31;
                  return flow.btcSwap.withdraw({
                    scriptValues: flow.state.btcScriptValues,
                    secret: secret
                  }, function (hash) {
                    flow.setState({
                      btcSwapWithdrawTransactionHash: hash
                    });
                  });

                case 31:

                  flow.finishStep({
                    isBtcWithdrawn: true
                  });

                case 32:
                case 'end':
                  return _context3.stop();
              }
            }
          }, _callee3, _this2, [[4, 11], [19, 25]]);
        })),

        // 8. Finish

        function () {}];
      }
    }, {
      key: 'sign',
      value: function () {
        var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4() {
          var _this3 = this;

          var participant;
          return _regenerator2.default.wrap(function _callee4$(_context4) {
            while (1) {
              switch (_context4.prev = _context4.next) {
                case 0:
                  participant = this.swap.participant;


                  this.setState({
                    isSignFetching: true
                  });

                  _context4.next = 4;
                  return this.ethTokenSwap.sign({
                    participantAddress: participant.eth.address
                  }, function (hash) {
                    _this3.setState({
                      hash: hash
                    });
                  });

                case 4:

                  this.swap.room.sendMessage('swap sign');

                  this.finishStep({
                    isMeSigned: true
                  });

                case 6:
                case 'end':
                  return _context4.stop();
              }
            }
          }, _callee4, this);
        }));

        function sign() {
          return _ref5.apply(this, arguments);
        }

        return sign;
      }()
    }, {
      key: 'verifyBtcScript',
      value: function verifyBtcScript() {
        this.finishStep({
          btcScriptVerified: true
        });
      }
    }, {
      key: 'syncBalance',
      value: function () {
        var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5() {
          var sellAmount, balance, isEnoughMoney;
          return _regenerator2.default.wrap(function _callee5$(_context5) {
            while (1) {
              switch (_context5.prev = _context5.next) {
                case 0:
                  sellAmount = this.swap.sellAmount;


                  this.setState({
                    isBalanceFetching: true
                  });

                  _context5.next = 4;
                  return this.ethTokenSwap.fetchBalance(_swap2.default.services.auth.accounts.eth.address);

                case 4:
                  balance = _context5.sent;
                  isEnoughMoney = sellAmount.isLessThanOrEqualTo(balance);


                  if (isEnoughMoney) {
                    this.finishStep({
                      balance: balance,
                      isBalanceFetching: false,
                      isBalanceEnough: true
                    });
                  } else {
                    this.setState({
                      balance: balance,
                      isBalanceFetching: false,
                      isBalanceEnough: false
                    });
                  }

                case 7:
                case 'end':
                  return _context5.stop();
              }
            }
          }, _callee5, this);
        }));

        function syncBalance() {
          return _ref6.apply(this, arguments);
        }

        return syncBalance;
      }()
    }, {
      key: 'tryRefund',
      value: function () {
        var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6() {
          var _this4 = this;

          var participant, _state, secret, btcScriptValues;

          return _regenerator2.default.wrap(function _callee6$(_context6) {
            while (1) {
              switch (_context6.prev = _context6.next) {
                case 0:
                  participant = this.swap.participant;
                  _state = this.state, secret = _state.secret, btcScriptValues = _state.btcScriptValues;


                  secret = 'c0809ce9f484fdcdfb2d5aabd609768ce0374ee97a1a5618ce4cd3f16c00a078';

                  _context6.prev = 3;

                  console.log('TRYING REFUND!');

                  _context6.prev = 5;
                  _context6.next = 8;
                  return this.ethTokenSwap.refund({
                    participantAddress: participant.eth.address
                  }, function (hash) {
                    _this4.setState({
                      refundTransactionHash: hash
                    });
                  });

                case 8:

                  console.log('SUCCESS REFUND!');
                  return _context6.abrupt('return');

                case 12:
                  _context6.prev = 12;
                  _context6.t0 = _context6['catch'](5);

                  console.err('REFUND FAILED!', _context6.t0);

                case 15:
                  _context6.next = 20;
                  break;

                case 17:
                  _context6.prev = 17;
                  _context6.t1 = _context6['catch'](3);

                  console.error('Mbe it\'s still under lockTime?! ' + _context6.t1);

                case 20:

                  if (!btcScriptValues) {
                    console.error('You can\'t do refund w/o btc script values! Try wait until lockTime expires on eth contract!');
                  }

                  if (secret) {
                    _context6.next = 32;
                    break;
                  }

                  _context6.prev = 22;
                  _context6.next = 25;
                  return this.ethTokenSwap.getSecret(data);

                case 25:
                  secret = _context6.sent;
                  _context6.next = 32;
                  break;

                case 28:
                  _context6.prev = 28;
                  _context6.t2 = _context6['catch'](22);

                  console.error('Can\'t receive secret from contract');
                  return _context6.abrupt('return');

                case 32:

                  console.log('TRYING WITHDRAW!');

                  _context6.prev = 33;
                  _context6.next = 36;
                  return this.btcSwap.withdraw({
                    scriptValues: this.state.btcScriptValues,
                    secret: secret
                  }, function (hash) {
                    _this4.setState({
                      btcSwapWithdrawTransactionHash: hash
                    });
                  });

                case 36:

                  console.log('SUCCESS WITHDRAW!');
                  _context6.next = 42;
                  break;

                case 39:
                  _context6.prev = 39;
                  _context6.t3 = _context6['catch'](33);

                  console.error('WITHDRAW FAILED!', _context6.t3);

                case 42:
                case 'end':
                  return _context6.stop();
              }
            }
          }, _callee6, this, [[3, 17], [5, 12], [22, 28], [33, 39]]);
        }));

        function tryRefund() {
          return _ref7.apply(this, arguments);
        }

        return tryRefund;
      }()
    }]);
    return ETHTOKEN2BTC;
  }(_swap3.Flow);

  return ETHTOKEN2BTC;
};

module.exports = exports['default'];