import { EthSwap, EthTokenSwap, BtcSwap } from 'swap.swaps'

const FETCH_RESULT = 100;
const ADDRESS = 'ADRESS';

const mockFetch = (adress)=>{
    return Promise.resolve(FETCH_RESULT);
}
const btcOwnerBitcoin = new BtcSwap({
    fetchBalance: (mockAdress) => mockFetch(mockAdress),
    fetchUnspents: (mockAdress) => mockFetch(mockAdress),
    broadcastTx: (mockAdress) => mockFetch(mockAdress),
});

describe('BtcSwap tests',()=>{
    test('Return balance for BtcSwap', function(done){
        expect(btcOwnerBitcoin.fetchBalance(ADDRESS)).resolves.toEqual(FETCH_RESULT);
        done();
    });

    test('Return unspents for BtcSwap', function(done){
        expect(btcOwnerBitcoin.fetchUnspents(ADDRESS)).resolves.toEqual(FETCH_RESULT);
        done();
    });

    test('Return tx for BtcSwap', function(done){
        expect(btcOwnerBitcoin.broadcastTx(ADDRESS)).resolves.toEqual(FETCH_RESULT);
        done();
    });
})
