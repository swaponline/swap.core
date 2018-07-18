'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _swap2 = require('swap.app');

var _swap3 = _interopRequireDefault(_swap2);

var _Room = require('./Room');

var _Room2 = _interopRequireDefault(_Room);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Flow = function () {
  function Flow(swap) {
    (0, _classCallCheck3.default)(this, Flow);

    this.swap = swap;
    this.steps = [];

    this.state = {
      step: 0,
      isWaitingForOwner: false
    };
  }

  (0, _createClass3.default)(Flow, [{
    key: '_persistState',
    value: function _persistState() {
      var _this = this;

      var state = _swap3.default.env.storage.getItem('flow.' + this.swap.id);

      if (state) {
        this.state = (0, _extends3.default)({}, this.state, state);
      }

      this.swap.room.on('persist state', function (values) {
        _this.setState(values, true);
      });
    }
  }, {
    key: '_persistSteps',
    value: function _persistSteps() {
      var _this2 = this;

      this.steps = [].concat((0, _toConsumableArray3.default)(this._getInitialSteps()), (0, _toConsumableArray3.default)(this._getSteps()));

      // wait events placed
      setTimeout(function () {
        if (_this2.state.step >= _this2.steps.length) return;else _this2.goStep(_this2.state.step);
      }, 0);
    }
  }, {
    key: '_getInitialSteps',
    value: function _getInitialSteps() {
      var _this3 = this;

      var flow = this;

      return [

      // Check if order exists

      (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
        var _swap, orderId, owner;

        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _swap = _this3.swap, orderId = _swap.id, owner = _swap.owner;

                // TODO how can we don't know who is participant???
                // TODO if there is no participant in `order` then no need to create Flow...
                // if there is no order it orderCollection that means owner is offline, so `swap.owner` will be undefined

                if (!owner) {
                  flow.setState({
                    isWaitingForOwner: true
                  });

                  _swap3.default.services.room.on('new orders', function (_ref2) {
                    var orders = _ref2.orders;

                    var order = orders.find(function (_ref3) {
                      var id = _ref3.id;
                      return id === orderId;
                    });

                    if (order) {
                      this.unsubscribe();

                      var _order = orders.getByKey(orderId);

                      // TODO move this to Swap.js
                      flow.swap.room = new _Room2.default({
                        participantPeer: _order.owner.peer
                      });
                      flow.swap.update((0, _extends3.default)({}, _order, {
                        participant: _order.owner
                      }));
                      flow.finishStep({
                        isWaitingForOwner: false
                      });
                    }
                  });
                } else {
                  flow.finishStep();
                }

              case 2:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, _this3);
      }))];
    }
  }, {
    key: '_getSteps',
    value: function _getSteps() {
      return [];
    }
  }, {
    key: '_saveState',
    value: function _saveState() {
      _swap3.default.env.storage.setItem('flow.' + this.swap.id, this.state);
    }
  }, {
    key: 'finishStep',
    value: function finishStep(data) {
      this.goNextStep(data);
    }
  }, {
    key: 'goNextStep',
    value: function goNextStep(data) {
      var step = this.state.step;

      var newStep = step + 1;

      this.swap.events.dispatch('leave step', step);

      this.setState((0, _extends3.default)({
        step: newStep
      }, data || {}), true);

      this.goStep(newStep);
    }
  }, {
    key: 'goStep',
    value: function goStep(index) {
      this.swap.events.dispatch('enter step', index);
      this.steps[index]();
    }
  }, {
    key: 'setState',
    value: function setState(values, save) {
      this.state = (0, _extends3.default)({}, this.state, values);

      if (save) {
        this._saveState();
      }

      this.swap.events.dispatch('state update', this.state, values);
    }
  }]);
  return Flow;
}();

exports.default = Flow;
module.exports = exports['default'];