# NEXT.coin node - HOWTO


## Terms

nextd - NEXT.coin node daemon
nextp - http RPC proxy

## Install

### Install `nextd`

```sh
sudo sh install-nextd.sh
```
or install it manually (download `nextd` from https://chain.next.exchange/#downloads)

or build it from sources (by request)

### Install dependencies

`npm i`


## Start

`sh start-nextd.sh` - start nextd

`node nextd-proxy` - start nextd proxy

`pm2 start nextd-proxy.js` - start nextd proxy (prod)


## Logs

`sh log-nextd` - nextd logs

`pm2 log nextd-proxy` - nextd-proxy logs


## Stop

`sh start-nextd.sh` - stop nextd

`pm2 stop nextd-proxy` - stop nextd proxy (prod)


## Develop & debug

`sh request-example.sh` - request example

See available request methods in `next-rpc-methods.txt`

See also `next-options.txt`
