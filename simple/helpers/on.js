module.exports = (emitter, _event) => new Promise(resolve => emitter.on(_event, resolve))
