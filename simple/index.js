require('babel-core/register')

require('app-module-path/register') // on windows
require('app-module-path').addPath(__dirname + '/../lib')

const setup = require('./setup')

module.exports = { setup }
