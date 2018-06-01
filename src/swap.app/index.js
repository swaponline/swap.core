import setupServices from './setupServices'
import setupSwaps from './setupSwaps'


class SwapApp {

  /**
   *
   * @param options
   * @param options.services
   * @param options.swaps
   */
  constructor(options) {
    setupServices(this, options.services)
    this.swaps = setupSwaps(options.swaps)
  }
}


export default SwapApp
