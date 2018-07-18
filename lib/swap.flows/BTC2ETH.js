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

var _crypto = require('bitcoinjs-lib/src/crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _swap = require('swap.app');

var _swap2 = _interopRequireDefault(_swap);

var _swap3 = require('swap.swap');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var BTC2ETH = function (_Flow) {
  (0, _inherits3.default)(BTC2ETH, _Flow);
  (0, _createClass3.default)(BTC2ETH, null, [{
    key: 'getName',
    value: function getName() {
      return _swap.constants.COINS.btc + '2' + _swap.constants.COINS.eth;
    }
  }]);

  function BTC2ETH(swap) {
    (0, _classCallCheck3.default)(this, BTC2ETH);

    var _this = (0, _possibleConstructorReturn3.default)(this, (BTC2ETH.__proto__ || (0, _getPrototypeOf2.default)(BTC2ETH)).call(this, swap));

    _this._flowName = BTC2ETH.getName();

    _this.ethSwap = _swap2.default.swaps[_swap.constants.COINS.eth];
    _this.btcSwap = _swap2.default.swaps[_swap.constants.COINS.btc];
    _this.myBtcAddress = _swap2.default.services.auth.accounts.btc.getAddress();

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
      isParticipantSigned: false,

      btcScriptCreatingTransactionHash: null,
      ethSwapCreationTransactionHash: null,

      secretHash: null,
      btcScriptValues: null,

      btcScriptVerified: false,

      isBalanceFetching: false,
      isBalanceEnough: false,
      balance: null,

      isEthContractFunded: false,

      ethSwapWithdrawTransactionHash: null,
      isEthWithdrawn: false,

      refundTransactionHash: null,
      isRefunded: false
    };

    (0, _get3.default)(BTC2ETH.prototype.__proto__ || (0, _getPrototypeOf2.default)(BTC2ETH.prototype), '_persistSteps', _this).call(_this);
    _this._persistState();
    return _this;
  }

  (0, _createClass3.default)(BTC2ETH, [{
    key: '_persistState',
    value: function _persistState() {
      (0, _get3.default)(BTC2ETH.prototype.__proto__ || (0, _getPrototypeOf2.default)(BTC2ETH.prototype), '_persistState', this).call(this);

      // this.ethSwap.getBalance({
      //   ownerAddress: this.swap.participant.eth.address,
      // })
      //   .then((balance) => {
      //     console.log('balance:', balance)
      //   })
    }
  }, {
    key: '_getSteps',
    value: function _getSteps() {
      var _this2 = this;

      var flow = this;

      return [

      // 1. Signs

      function () {
        flow.finishStep({
          isParticipantSigned: true
        });
      },
      // 2. Create secret, secret hash

      function () {
        // this.submitSecret()
      },

      // 3. Check balance

      function () {
        _this2.syncBalance();
      },

      // 4. Create BTC Script, fund, notify participant

      (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
        var _flow$swap, sellAmount, participant, btcScriptCreatingTransactionHash, utcNow, getLockTime, scriptValues;

        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _flow$swap = flow.swap, sellAmount = _flow$swap.sellAmount, participant = _flow$swap.participant;
                btcScriptCreatingTransactionHash = void 0;

                // TODO move this somewhere!

                utcNow = function utcNow() {
                  return Math.floor(Date.now() / 1000);
                };

                getLockTime = function getLockTime() {
                  return utcNow() + 3600 * 3;
                }; // 3 hours from now

                scriptValues = {
                  secretHash: flow.state.secretHash,
                  ownerPublicKey: _swap2.default.services.auth.accounts.btc.getPublicKey(),
                  recipientPublicKey: participant.btc.publicKey,
                  lockTime: getLockTime()
                };
                _context.next = 7;
                return flow.btcSwap.fundScript({
                  scriptValues: scriptValues,
                  amount: sellAmount
                }, function (hash) {
                  btcScriptCreatingTransactionHash = hash;
                  flow.setState({
                    btcScriptCreatingTransactionHash: hash
                  });
                });

              case 7:

                flow.swap.room.sendMessage('create btc script', {
                  scriptValues: scriptValues,
                  btcScriptCreatingTransactionHash: btcScriptCreatingTransactionHash
                });

                flow.finishStep({
                  isBtcScriptFunded: true,
                  btcScriptValues: scriptValues
                });

              case 9:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, _this2);
      })),

      // 5. Wait participant creates ETH Contract

      function () {
        var participant = flow.swap.participant;

        var timer = void 0;

        flow.swap.room.once('create eth contract', function (_ref2) {
          var ethSwapCreationTransactionHash = _ref2.ethSwapCreationTransactionHash;

          flow.setState({
            ethSwapCreationTransactionHash: ethSwapCreationTransactionHash
          });
        });

        var checkEthBalance = function checkEthBalance() {
          timer = setTimeout((0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2() {
            var balance;
            return _regenerator2.default.wrap(function _callee2$(_context2) {
              while (1) {
                switch (_context2.prev = _context2.next) {
                  case 0:
                    _context2.next = 2;
                    return flow.ethSwap.getBalance({
                      ownerAddress: participant.eth.address
                    });

                  case 2:
                    balance = _context2.sent;


                    if (balance > 0) {
                      if (!flow.state.isEthContractFunded) {
                        // redundant condition but who cares :D
                        flow.finishStep({
                          isEthContractFunded: true
                        });
                      }
                    } else {
                      checkEthBalance();
                    }

                  case 4:
                  case 'end':
                    return _context2.stop();
                }
              }
            }, _callee2, _this2);
          })), 20 * 1000);
        };

        checkEthBalance();

        flow.swap.room.once('create eth contract', function () {
          if (!flow.state.isEthContractFunded) {
            clearTimeout(timer);
            timer = null;

            flow.finishStep({
              isEthContractFunded: true
            });
          }
        });
      },

      // 6. Withdraw

      (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3() {
        var _flow$swap2, buyAmount, participant, data, balanceCheckResult;

        return _regenerator2.default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _flow$swap2 = flow.swap, buyAmount = _flow$swap2.buyAmount, participant = _flow$swap2.participant;
                data = {
                  ownerAddress: participant.eth.address,
                  secret: flow.state.secret
                };
                _context3.next = 4;
                return flow.ethSwap.checkBalance({
                  ownerAddress: participant.eth.address,
                  expectedValue: buyAmount
                });

              case 4:
                balanceCheckResult = _context3.sent;

                if (!balanceCheckResult) {
                  _context3.next = 9;
                  break;
                }

                console.error('Eth balance check error:', balanceCheckResult);
                flow.swap.events.dispatch('eth balance check error', balanceCheckResult);
                return _context3.abrupt('return');

              case 9:
                _context3.next = 11;
                return flow.ethSwap.withdraw(data, function (hash) {
                  flow.setState({
                    ethSwapWithdrawTransactionHash: hash
                  });
                });

              case 11:

                flow.swap.room.sendMessage('finish eth withdraw');

                flow.finishStep({
                  isEthWithdrawn: true
                });

              case 13:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, _this2);
      })),

      // 7. Finish

      function () {}];
    }
  }, {
    key: 'submitSecret',
    value: function submitSecret(secret) {
      if (this.state.secret) return;

      var secretHash = _crypto2.default.ripemd160(Buffer.from(secret, 'hex')).toString('hex');

      this.finishStep({
        secret: secret,
        secretHash: secretHash
      });
    }
  }, {
    key: 'sign',
    value: function () {
      var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4() {
        return _regenerator2.default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                if (!this.state.isMeSigned) {
                  _context4.next = 2;
                  break;
                }

                return _context4.abrupt('return');

              case 2:

                this.setState({
                  isSignFetching: true
                });

                this.swap.room.sendMessage('swap sign');

                this.finishStep({
                  isMeSigned: true
                });

              case 5:
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
                return this.btcSwap.fetchBalance(this.myBtcAddress);

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

      return this.btcSwap.refund({
        scriptValues: this.state.btcScriptValues,
        secret: this.state.secret
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
  return BTC2ETH;
}(_swap3.Flow);

exports.default = BTC2ETH;
module.exports = exports['default'];