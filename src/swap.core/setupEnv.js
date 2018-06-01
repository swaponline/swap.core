import constants from './constants'


export default (env) => {
  Object.keys(env).forEach((name) => {
    if (constants.ENV_NAMES.indexOf(name) < 0) {
      const list  = JSON.stringify(constants.ENV_NAMES).replace(/"/g, '\'')
      const error = `SwapCore.setupEnv(): Only [${list}] available`

      throw new Error(error)
    }
  })

  return env
}
