import Bitcoin from './bitcoin'

const mockBtcAdress = 'mo9ncXisMeAoXwqcV5EWuyncbmCcQN4rVs'

describe('Tests for Bitcoin instance', () => {

    test('Getting Bitcoin balance',  () => {
        Bitcoin.fetchBalance(mockBtcAdress).then(result => {
            expect(typeof result).toBe('number')
        })
    })

})
