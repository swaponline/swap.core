import SwapCore from '../swap.core'


export default (swapApp, services) => {
  services.forEach((service) => {
    if (!service._name) {
      throw new Error('SwapApp service should contain "_name" property')
    }

    if (SwapCore.constants.SERVICE_NAMES.indexOf(service._name) < 0) {
      const list  = JSON.stringify(SwapCore.constants.SERVICE_NAMES).replace(/"/g, '\'')
      const error = `SwapApp.setupServices(): Only ${list} available`

      throw new Error(error)
    }

    swapApp[service._name] = service
    service.swapApp = swapApp

    if (typeof service.init === 'function') {
      service.init()
    }
  })
}
