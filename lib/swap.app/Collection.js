"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _keys = require("babel-runtime/core-js/object/keys");

var _keys2 = _interopRequireDefault(_keys);

var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require("babel-runtime/helpers/createClass");

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Collection = function () {
  (0, _createClass3.default)(Collection, [{
    key: "_constructor",


    // _constructor for aggregation
    value: function _constructor() {
      this.items = [];
      this.itemIds = {};
    }
  }]);

  function Collection() {
    (0, _classCallCheck3.default)(this, Collection);

    this._constructor();
  }

  /**
   * Add item at the start of current collection
   * @param item
   * @param key {string|number}
   * @returns {*}
   */


  (0, _createClass3.default)(Collection, [{
    key: "prepend",
    value: function prepend(item, key) {
      this.items.unshift(item);
      if (key) {
        for (var _key in this.itemIds) {
          if (this.itemIds.hasOwnProperty(_key)) {
            this.itemIds[_key] += 1;
          }
        }
        this.itemIds[key] = 0;
      }
      return item;
    }

    /**
     * Add item at the end of current collection
     * @param item
     * @param key {string|number}
     * @returns {*}
     */

  }, {
    key: "append",
    value: function append(item, key) {
      this.items.push(item);
      if (key) {
        this.itemIds[key] = this.items.length - 1;
      }
      return item;
    }

    /**
     * Remove item by index from current collection
     * @param index
     * @returns {*}
     */

  }, {
    key: "removeByIndex",
    value: function removeByIndex(index) {
      this.items = this.items.splice(index, 1);
    }

    /**
     * Remove item by key [id] from current collection
     * @param key {string|number}
     * @returns {*}
     */

  }, {
    key: "removeByKey",
    value: function removeByKey(key) {
      var _this = this;

      var index = this.itemIds[key];

      if (index !== undefined) {
        this.items.splice(index, 1);
        delete this.itemIds[key];

        (0, _keys2.default)(this.itemIds).forEach(function (key) {
          if (_this.itemIds[key] > index) {
            _this.itemIds[key]--;
          }
        });
      }
    }

    /**
     * Get index of item in current collection
     * @param item
     * @returns {number}
     */

  }, {
    key: "indexOf",
    value: function indexOf(item) {
      return this.items.indexOf(item);
    }

    /**
     * Get item by index from current collection
     * @param index
     * @returns {*}
     */

  }, {
    key: "getByIndex",
    value: function getByIndex(index) {
      return this.items[index];
    }

    /**
     * Get item by key [id] from current collection
     * @param key {string|number}
     * @returns {*}
     */

  }, {
    key: "getByKey",
    value: function getByKey(key) {
      return this.items[this.itemIds[key]];
    }
  }, {
    key: "isExist",
    value: function isExist(item) {
      return this.items.includes(item);
    }

    /**
     * Check if item with such name exists in current collection
     * @param key {string|number}
     * @returns {boolean}
     */

  }, {
    key: "isExistByKey",
    value: function isExistByKey(key) {
      return Boolean(this.getByKey(key));
    }
  }]);
  return Collection;
}();

exports.default = Collection;
module.exports = exports["default"];