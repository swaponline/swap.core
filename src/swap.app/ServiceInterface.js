class ServiceInterface {

  // _constructor for aggregation
  _constructor() {
    this._serviceName = null
  }

  constructor() {
    // service name, within it will be stored in SwapApp.services
    this._serviceName = null
  }

  _initService() {
    // init service on SwapApp mounting
  }
}


export default ServiceInterface
