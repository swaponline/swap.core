import Ethereum  from './ethereum'

const mockEthAdress = '0xddbd2b932c763ba5b1b7ae3b362eac3e8d40121a'
const mockTokenAdress = '0x527458d3d3a3af763dbe2ccc5688d64161e81d97'

describe('Tests for Ethereum instance', () => {

    test('Getting Ethereum balance',  () => {
        Ethereum.fetchBalance(mockEthAdress).then(result => {
            expect(typeof result).toBe('number')
        })
    })

    test('Getting token balance',  () => {
        Ethereum.fetchTokenBalance(mockTokenAdress).then(result => {
            expect(typeof result).toBe('number')
        })
    })

})


