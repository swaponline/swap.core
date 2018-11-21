require('babel-core/register')

require('app-module-path/register') // on windows

require('app-module-path').addPath(__dirname + '/../node_modules/swap.core/lib')
require('app-module-path').addPath(__dirname + '/../swap.core/lib')
require('app-module-path').addPath(__dirname + '/../../swap.core/lib')

const setup = require('./setup')
const helpers = require('./helpers')

module.exports = { setup, helpers }
