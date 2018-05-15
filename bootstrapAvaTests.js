global.window = {}
global.log = global.console.log
global.console.log = () => {}
global.localStorage = {
  getItem: () => {},
  setItem: () => {},
}


require('babel-polyfill')
require('babel-register')
