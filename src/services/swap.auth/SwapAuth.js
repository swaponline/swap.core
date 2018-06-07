import SwapApp, { ServiceInterface, constants } from '../../swap.app'


let _privateKeys

class SwapAuth extends ServiceInterface {

  constructor(privateKeys) {
    super()

    this._serviceName   = 'auth'
    this.accounts       = {}

    _privateKeys = privateKeys
  }

  _initService() {
    Object.keys(_privateKeys).forEach((name) => {
      if (constants.COINS.indexOf(name) < 0) {
        let error = `SwapAuth._initService(): There is no instance with name "${name}".`
        error += `Only [${JSON.stringify(constants.COINS).replace(/"/g, '\'')}] available`

        throw new Error(error)
      }

      try {
        let instance = require(`./${name}`)
        instance = instance.default || instance
        instance.login(_privateKeys[name])

        this.accounts[name] = instance
      }
      catch (err) {
        throw new Error(`SwapAuth._initService(): ${err}`)
      }
    })
  }

  getPublicData() {
    const data = {
      peer: SwapApp.services.room.peer,
    }

    Object.keys(this.accounts).forEach((name) => {
      data[name] = this.accounts[name].getPublicData()
    })

    return data
  }
}


export default SwapAuth
