require('babel-core/register')

require('app-module-path').addPath(__dirname + '/src')

exports = module.exports = require('./src')
