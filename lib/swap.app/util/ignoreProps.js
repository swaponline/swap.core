"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _keys = require("babel-runtime/core-js/object/keys");

var _keys2 = _interopRequireDefault(_keys);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ignoreProps = function ignoreProps() {
  for (var _len = arguments.length, ignored = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    ignored[_key - 1] = arguments[_key];
  }

  var props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var list = {};

  (0, _keys2.default)(props).forEach(function (key) {
    if (!ignored.includes(key)) {
      list[key] = props[key];
    }
  });

  return list;
};

exports.default = ignoreProps;
module.exports = exports["default"];