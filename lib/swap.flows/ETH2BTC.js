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

var ETH2BTC = function (_Flow) {
  (0, _inherits3.default)(ETH2BTC, _Flow);
  (0, _createClass3.default)(ETH2BTC, null, [{
    key: 'getName',
    value: function getName() {
      return _swap.constants.COINS.eth + '2' + _swap.constants.COINS.btc;
    }
  }]);

  function ETH2BTC(swap) {
    (0, _classCallCheck3.default)(this, ETH2BTC);

    var _this = (0, _possibleConstructorReturn3.default)(this, (ETH2BTC.__proto__ || (0, _getPrototypeOf2.default)(ETH2BTC)).call(this, swap));

    _this._flowName = ETH2BTC.getName();

    _this.ethSwap = _swap2.default.swaps[_swap.constants.COINS.eth];
    _this.btcSwap = _swap2.default.swaps[_swap.constants.COINS.btc];

    if (!_this.ethSwap) {
      throw new Error('BTC2ETH: "ethSwap" of type object required');
    }
    if (!_this.btcSwap) {
      throw new Error('BTC2ETH: "btcSwap" of type object required');
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

      refundTransactionHash: null,
      isRefunded: false
    };

    (0, _get3.default)(ETH2BTC.prototype.__proto__ || (0, _getPrototypeOf2.default)(ETH2BTC.prototype), '_persistSteps', _this).call(_this);
    _this._persistState();
    return _this;
  }

  (0, _createClass3.default)(ETH2BTC, [{
    key: '_persistState',
    value: function _persistState() {
      (0, _get3.default)(ETH2BTC.prototype.__proto__ || (0, _getPrototypeOf2.default)(ETH2BTC.prototype), '_persistState', this).call(this);

      // console.log('START GETTING SECRET')
      //
      // this.ethSwap.getSecret({
      //   participantAddress: this.swap.participant.eth.address,
      // })
      //   .then((res) => {
      //     console.log('SECRET', res)
      //   })
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
                return _this2.ethSwap.create(swapData, function (hash) {
                  flow.setState({
                    ethSwapCreationTransactionHash: hash
                  });
                });

              case 13:

                flow.swap.room.sendMessage('create eth contract');

                flow.finishStep({
                  isEthContractFunded: true
                });

              case 15:
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
                    return flow.ethSwap.getSecret({
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
        var participant, _flow$state, secret, isEthClosed, btcScriptValues, balance;

        return _regenerator2.default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                participant = flow.swap.participant;
                _flow$state = flow.state, secret = _flow$state.secret, isEthClosed = _flow$state.isEthClosed, btcScriptValues = _flow$state.btcScriptValues;

                if (btcScriptValues) {
                  _context3.next = 5;
                  break;
                }

                console.error('There is no "btcScriptValues" in state. No way to continue swap...');
                return _context3.abrupt('return');

              case 5:
                if (secret) {
                  _context3.next = 17;
                  break;
                }

                _context3.prev = 6;
                _context3.next = 9;
                return flow.ethSwap.getSecret({
                  participantAddress: participant.eth.address
                });

              case 9:
                secret = _context3.sent;


                flow.setState({
                  secret: secret
                });
                _context3.next = 17;
                break;

              case 13:
                _context3.prev = 13;
                _context3.t0 = _context3['catch'](6);

                // TODO user can stuck here after page reload...
                console.error(_context3.t0);
                return _context3.abrupt('return');

              case 17:
                if (secret) {
                  _context3.next = 28;
                  break;
                }

                _context3.next = 20;
                return flow.btcSwap.getBalance(btcScriptValues);

              case 20:
                balance = _context3.sent;


                console.log('balance', balance);

                if (!(balance === 0)) {
                  _context3.next = 26;
                  break;
                }

                console.log('Look like you already did withdraw');

                flow.finishStep({
                  isBtcWithdrawn: true
                });

                return _context3.abrupt('return');

              case 26:

                console.error('FAIL! secret: ' + secret + ', balance: ' + balance);
                return _context3.abrupt('return');

              case 28:
                if (isEthClosed) {
                  _context3.next = 37;
                  break;
                }

                _context3.prev = 29;

                // TODO BE CAREFUL WITH CLOSE()!
                // TODO if call .close() before secret received then ETH participant will lost it and never withdraw from BTC script...

                flow.setState({
                  isEthClosed: true
                });
                _context3.next = 37;
                break;

              case 33:
                _context3.prev = 33;
                _context3.t1 = _context3['catch'](29);

                // TODO notify user that smth goes wrong
                console.error(_context3.t1);
                return _context3.abrupt('return');

              case 37:
                _context3.next = 39;
                return flow.btcSwap.withdraw({
                  scriptValues: flow.state.btcScriptValues,
                  secret: secret
                }, function (hash) {
                  flow.setState({
                    btcSwapWithdrawTransactionHash: hash
                  });
                });

              case 39:

                flow.finishStep({
                  isBtcWithdrawn: true
                });

              case 40:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, _this2, [[6, 13], [29, 33]]);
      })),

      // 8. Finish

      function () {}];
    }
  }, {
    key: 'sign',
    value: function () {
      var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4() {
        var participant;
        return _regenerator2.default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                participant = this.swap.participant;


                this.setState({
                  isSignFetching: true
                });

                this.swap.room.sendMessage('swap sign');

                this.finishStep({
                  isMeSigned: true
                });

              case 4:
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
                return this.ethSwap.fetchBalance(_swap2.default.services.auth.accounts.eth.address);

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
    value: function tryRefund() {
      var _this3 = this;

      var participant = this.swap.participant;


      this.ethSwap.refund({
        participantAddress: participant.eth.address
      }, function (hash) {
        _this3.setState({
          refundTransactionHash: hash
        });
      }).then(function () {
        _this3.setState({
          isRefunded: true
        });
      });
    }
  }]);
  return ETH2BTC;
}(_swap3.Flow);

exports.default = ETH2BTC;
module.exports = exports['default'];