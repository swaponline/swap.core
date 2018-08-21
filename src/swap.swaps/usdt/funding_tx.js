const bitcoin = require('bitcoinjs-lib')
const net = bitcoin.networks.bitcoin

// const getUnspents = require('./unspents')
const createScript = require('./swap_script')

const createFundingTransaction = async (dialog, scriptValues, getUnspents, network) => {
  const { secretHash: hash, lockTime: locktime } = scriptValues
  const { owner: alice_pair, party: bob_key } = dialog

  // payment_address Alice_address=Alice_private.to_payment_address();
  // const alice_pair = bitcoin.ECPair(alice_privkey)

  // transaction funding_tx;
  const funding_tx = new bitcoin.TransactionBuilder(network)

  // funding_tx.set_version(1u);
  //

  //входы транзакции(в идеале лучше было бы, еслиб программа сама находила и строила входы, как например с помощью функции getUTXO, суть ее в том, чтобы обраться к серверу(в данном случае libbitcoin серверу) и отправить запрос на получение данных из блокчейна, из которые уже можно бы было получить UTXO для конкретного адреса,но сервер возвращает пустое множество UTXO, для любого адреса. долгое время не смогя разобраться с этой проблемой, было решено пока возложить на пользователя задачу найти и вписать свой UTXO)
  //выходы можно самостоятельно посмотреть на сайте
  //https://live.blockcypher.com/btc-testnet/tx/62408b1b14ce9eea82b73b543cfb0bdfc4ec118b9d50c07e6c6d75ba3c6a7b59/
  //тут необходимо ввести хэш транзакции в которой есть непотраченный выход

  /*
    std::string PrevTxHash_str;
    std::cout << "\n write your prev UTXO hash in base16, once output from this will input for channel's creation's transaction:\n";
    std::cin >> PrevTxHash_str;
    hash_digest PrevTxHash;
    decode_hash(PrevTxHash, PrevTxHash_str);
  */

  //тут нужно ввести индекс непотраченного выхода, индексация начинается с нуля, выходы например на сайте
  //https://live.blockcypher.com/btc-testnet/tx/62408b1b14ce9eea82b73b543cfb0bdfc4ec118b9d50c07e6c6d75ba3c6a7b59/
  //расположены сверху внизу в порядке увеличения их индекса
  /*
    uint32_t PrevTxIndex;
    std::cout<<"\n write index unspended output of your UTXO, its output will be input:\n";
    std::cin>>PrevTxIndex;

    output_point UTXO(PrevTxHash, PrevTxIndex);
  */

  // const alice_p2pkh = bitcoin.payments.p2pkh({ pubkey: alice_pair.publicKey, network: net })

  const alice_p2pkh = alice_pair.getAddress()
  const unspents = await getUnspents(alice_p2pkh)
  // const UTXO = unspents[0] // { txid, vout, satoshis }

  console.log('unspents', unspents)

  /*
    std::string OddMoney_btc;
    uint64_t OddMoney_satoshi;
    std::cout<<"\n write odd money (in BTC), for creating p2pkh output on your address. Dont forgot about transaction's fees:\n";
    std::cin>>OddMoney_btc;
    decode_base10(OddMoney_satoshi,OddMoney_btc, btc_decimal_places);
  */

  const fundValue     = 546 // dust
  const feeValue      = 1000
  const totalUnspent  = unspents.reduce((summ, { satoshis }) => summ + satoshis, 0)
  const skipValue     = totalUnspent - fundValue - feeValue

  if (totalUnspent < feeValue + fundValue) {
    throw new Error(`Total less than fee: ${totalUnspent} < ${feeValue} + ${fundValue}`)
  }

  const OddMoney_satoshi = skipValue

  /*
    input input0;
    input0.set_previous_output(UTXO);
    input0.set_sequence(0xffffffff);

    funding_tx.inputs().push_back(input0); //добавим вход без подписи
  */

  /* funding_tx.addInput(UTXO.txid, UTXO.vout, 0xffffffff) */
  unspents.forEach(({ txid, vout }) => funding_tx.addInput(txid, vout, 0xfffffffe))

  //создадим выходы транзакции (2 выхода:
  //первый - 1 на адрес с атомик свопом
  //второй - сдача самому себе, выход со скриптом вида p2pkh

  /*
  operation::list SwapScript;
  SwapScript.push_back( operation(opcode::ripemd160) );
  SwapScript.push_back( operation(swap_secret_hash) );
  SwapScript.push_back( operation(opcode::equalverify) );

  SwapScript.push_back( operation(to_chunk(Bob_pubkey)) );
  SwapScript.push_back( operation(opcode::equal) );

  SwapScript.push_back( operation(opcode::if_) );

  SwapScript.push_back( operation(to_chunk(Bob_pubkey)) );
  SwapScript.push_back( operation(opcode::checksig) );

  SwapScript.push_back( operation(opcode::else_) );
  SwapScript.push_back( operation(uint32_to_data_chunk(locktime)) );
  SwapScript.push_back( operation(opcode::checklocktimeverify) );
  SwapScript.push_back( operation(opcode::drop) );
  SwapScript.push_back( operation(to_chunk(Alice_private.to_public().point() )) );
  SwapScript.push_back( operation(opcode::checksig) );

  SwapScript.push_back( operation(opcode::endif) );
  */

  const SwapScript = createScript(hash, alice_pair.getPublicKeyBuffer().toString('hex'), bob_key.toString('hex'), locktime)

  /*
  output Output0(SATOSHI_FOR_OMNI_OUTPUT,SwapScript); //вызываем конструктор класса output, в который передаем 1 - количество коинов, 2 - скрипт
  */
  const SATOSHI_FOR_OMNI_OUTPUT = fundValue
  funding_tx.addOutput(SwapScript.scriptAddress, SATOSHI_FOR_OMNI_OUTPUT)
  // funding_tx.addOutput(SwapScript.scriptAddress, SATOSHI_FOR_OMNI_OUTPUT)

  /*
  operation::list p2pkhScript=script::to_pay_key_hash_pattern(Alice_address.hash()); //скрипт для возвращает сдачу себе
  output Output1(OddMoney_satoshi, p2pkhScript); //создаем второй выход
  */
  funding_tx.addOutput(alice_p2pkh, OddMoney_satoshi)

  /*
  funding_tx.outputs().push_back(Output0);
  funding_tx.outputs().push_back(Output1);
  */
  // ...

  //после добавления всех входов и выходов подпишем транзакцию
  /*
  endorsement Sig0;
 // считаем скрипт выхода соответствующнго входу0 равен p2pkhScript
  script::create_endorsement(Sig0, Alice_private.secret(), p2pkhScript, funding_tx, 0, sighash_algorithm::all);

  operation::list  sig_script0;
  sig_script0.push_back(operation(Sig0));
  sig_script0.push_back(operation(to_chunk(Alice_private.to_public().point() )));
  script InputScript0(sig_script0);
  funding_tx.inputs()[0].set_script(InputScript0);
  */

  // funding_tx.sign(0, alice_pair) //, null, bitcoin.Transaction.SIGHASH_ALL)

  funding_tx.inputs.forEach((input, index) => {
    funding_tx.sign(index, alice_pair)
  })

  // return funding_tx;

  return {
    tx: funding_tx,
    scriptValues: {
      hash,
      locktime,
      scriptAddress: SwapScript.scriptAddress,
      scriptPubKey: SwapScript.scriptPubKey,
    },
    hex: funding_tx.buildIncomplete().toHex(),
  }
}


module.exports = createFundingTransaction
