import { ethereumInstance, bitcoinInstance } from './instances'
import { EthSwap, EthTokenSwap, BtcSwap } from './swap/swap.swaps'

const btcSwap = new BtcSwap({
    fetchUnspents: () => {},
    broadcastTx: () => {},
    fetchBalance: (address) => bitcoinInstance.fetchBalance(address)
})

const ethSwap = new EthSwap({
    address:'',
    abi: [],
    fetchBalance: (address) => ethereumInstance.fetchBalance(address)
})

const ethTokenSwap = new EthTokenSwap({
    address: '',
    abi: [] ,
    tokenAddress: '',
    tokenAbi: [],
    fetchBalance: (address) => ethereumInstance.fetchTokenBalance(address)
})

const mockBtcAdress = 'mo9ncXisMeAoXwqcV5EWuyncbmCcQN4rVs'
const mockEthAdress = '0xddbd2b932c763ba5b1b7ae3b362eac3e8d40121a'

describe('Tests for getting current balance', () => {

    test('Getting balance BtcSwap',  () => {
        btcSwap.fetchBalance(mockBtcAdress).then(result=>{
            expect(typeof result).toBe('number')
        })
    })

    test('Getting balance EthSwap',  () => {
        ethSwap.fetchBalance(mockEthAdress).then(result=>{
            expect(typeof result).toBe('number')
        })
    })

    test('Getting balance EthTokenSwap',  () => {
        ethTokenSwap.fetchBalance(mockEthAdress).then(result=>{
            expect(typeof result).toBe('number')
        })
    })

});



