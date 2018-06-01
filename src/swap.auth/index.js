import SwapCore from '../swap.core'


let _privateKeys

class SwapAuthService {

  constructor(privateKeys, options) {
  	this._name      = 'auth'
    this.swapApp    = null
    this.accounts   = {}

    _privateKeys = privateKeys

    this._onMount()
  }

  _onMount() {
    Object.keys(_privateKeys).forEach((name) => {
      if (SwapCore.constants.COIN_NAMES.indexOf(name) < 0) {
        let error = `SwapAuth.init(): There is no instance with name "${name}".`
        error += `Only [${JSON.stringify(SwapCore.constants.COIN_NAMES).replace(/"/g, '\'')}] available`

        throw new Error(error)
      }

      try {
        let instance = require(`./${name}`)
        instance = instance.default || instance
        instance.login(_privateKeys[name])

        this.accounts[name] = instance
      }
      catch (err) {
        throw new Error(`SwapAuth.init(): ${err}`)
      }
    })
  }

  getPublicData() {
    const data = {
      peer: this.swapApp.room.peer,
    }

    Object.keys(this.accounts).forEach((name) => {
      data[name] = this.accounts[name].getPublicData()
    })

    return data
  }
}


export default SwapAuthService
