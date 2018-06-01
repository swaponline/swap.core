import Events from './Events'
import Collection from './Collection'
import StorageFactory from './StorageFactory'
import constants from './constants'
import util from './util'


class SwapCore {

  configure(options) {
    this.constants    = constants
    this.util         = util
    this.env          = options.env
    this.env.storage  = new StorageFactory(options.env.storage)
  }
}


export default new SwapCore()

export {
  Collection,
  Events,
}
