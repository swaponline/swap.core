const request = require('request-promise-native')

const responseCacheStorage = {}

const responseCacheGetKey = (req, opts) => `${opts.method}-${opts.endpoint}`

const responseCacheGet = (req, opts) => {
  const cacheKey =  responseCacheGetKey(req, opts)

  if (opts
    && opts.cacheResponse
    && responseCacheStorage[cacheKey]
    && ((responseCacheStorage[cacheKey].cacheResponseCreateTime + responseCacheStorage[cacheKey].cacheResponse) >= new Date().getTime())
  ) {
    return responseCacheStorage[cacheKey]
  } return false
}

const responseCacheAdd = (req, opts, resData) => {
  const cacheKey = responseCacheGetKey(req, opts)
  const cacheResponse = opts.cacheResponse
  const cacheResponseCreateTime = new Date().getTime()

  responseCacheStorage[cacheKey] = {
    cacheResponse,
    cacheResponseCreateTime,
    resData,
  }
}

const responseQueryArray = new Array()
const responseQueryWorker = () => {
  if (responseQueryArray.length) {
    const currentQuery = responseQueryArray.shift()
    currentQuery( responseQueryWorker )
  } else {
    setTimeout( responseQueryWorker, 10 )
  }
}
responseQueryWorker()


const createResponseHandler = (req, opts) => {
  const debug = `${opts.method.toUpperCase()} ${opts.endpoint}`


  // no cache - do request
  return new Promise((fulfill, reject) => {
    const doRequest = ( nextTick ) => {
      // cached answer
      const cachedAnswer = responseCacheGet(req, opts)

      if (cachedAnswer) {
        setTimeout( nextTick, 500 )
        fulfill(cachedAnswer.resData)
        return
      }
      req.then( answer => {
        if (opts.cacheResponse) {
          responseCacheAdd(req, opts, answer)
        }
        setTimeout( nextTick, 500 )
        fulfill(answer)
      })
      .catch( error => {
        setTimeout( nextTick, 500 )
        reject(error)
      })
    }
    if (opts.queryResponse) {
      responseQueryArray.push( doRequest )
    } else {
      doRequest( () => {} )
    }
  })
}


const defaultOptions = {
  sameOrigin: false,
  modifyResult: (resData) => resData,
  onComplete: () => {},
}

/**
 *
 * @param {Object} options
 * @param {String} options.endpoint
 * @param {String} options.method
 * @param {Object} options.headers
 * @param {Object} options.query
 * @param {Object} options.body
 * @param {number} options.delay
 */
const sendRequest = (options) => {
  const opts = { ...defaultOptions, ...options }

  const req = request[opts.method](opts.endpoint)

  // req.set({
  //   'Content-Type': opts.formData ? 'application/x-www-form-urlencoded; charset=UTF-8' : 'application/json',
  //   ...(opts.headers || {}),
  // })

  if (opts.timeout) {
    req.timeout({
      response: 5000,  // Wait 5 seconds for the server to start sending,
      deadline: 60000, // but allow 1 minute for the file to finish loading.
      ...opts.timeout,
    })
  }

  if (opts.query) {
    req.query(opts.query)
  }

  if (opts.body) {
    req.send(opts.body)
  }

  if (opts.sameOrigin) {
    req.withCredentials()
  }

  const responseHandler = createResponseHandler(req, opts)

  responseHandler.abort = req.abort.bind(req)

  return responseHandler
}

const requestByMethod = (method) => (endpoint, opts) => sendRequest({ ...opts, endpoint, method })


export default {
  get: requestByMethod('get'),
  post: requestByMethod('post'),
  patch: requestByMethod('patch'),
  put: requestByMethod('put'),
  delete: requestByMethod('delete'),
}
