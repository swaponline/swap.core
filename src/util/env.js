const env = {
  web3: null,
  bitcoinJs: null,
  Ipfs: null,
  IpfsRoom: null,
}

const setupEnv = (values) => {
  Object.keys(values).forEach((key) => {
    env[key] = values[key]
  })
}


export {
  env,
  setupEnv,
}
