# NEXT.coin node - HOWTO


## Install

### Install NEXT.coin node

Download `nextd` (NEXT.coin node) https://chain.next.exchange/#downloads

or build it from sources (by request)

### Install dependencies

`npm i`


## Usage

`sh start-node.sh` - start node

`node nextd-proxy` - start node proxy


## Develop & debug

`sh request-example.sh` - request example

See available request methods in `node-rpc-methods.txt`

See also `node-options.txt`


## (Prod) NEXT.coin node daemon start/stop

`nextd -daemon -rpcuser=test -rpcpassword=test`

`start-stop-daemon --name nextd --stop`
