const sleep = require('sleep-promise');
const BigNumber = require('bignumber.js');

const ledger = require('../wasm');
const { getTransactionBuilder } = require('./services');
const { getOwnedSids, getUtxo, getOwnerMemo, getAssetToken, submitTransaction, getHashSwap } = require('./apis');

async function createReceivedTransferOperation(wallet, recieversInfo, assetCode, transferOp) {
  const totalUtxoNumbers = recieversInfo.reduce((acc, receiver) => {
    return BigInt(Number(receiver.utxoNumbers) + Number(acc));
  }, BigInt(0));

  let utxoNumbers = BigInt(0);

  const sids = await getOwnedSids(wallet.publickey);

  const utxoDataList = [];
  for (const sid of sids) {
    const [utxoData, memoData] = await Promise.all([getUtxo(sid), getOwnerMemo(sid)]);
    const assetRecord = ledger.ClientAssetRecord.from_json(utxoData.utxo);
    const ownerMemo = memoData ? ledger.OwnerMemo.from_json(memoData) : undefined;
    const decryptAssetData = ledger.open_client_asset_record(assetRecord, ownerMemo?.clone(), wallet.keypair);
    decryptAssetData.asset_type = ledger.asset_type_from_jsvalue(decryptAssetData.asset_type);
    decryptAssetData.amount = BigInt(decryptAssetData.amount);
    utxoDataList.push({
      address: wallet.address,
      sid,
      body: decryptAssetData || {},
      utxo: { ...utxoData.utxo },
      ownerMemo: ownerMemo?.clone(),
      memoData,
    });
  }

  let balance = totalUtxoNumbers;
  const sendUtxoList = [];
  for (const assetItem of utxoDataList) {
    if (assetItem.body.asset_type === assetCode) {
      const _amount = BigInt(assetItem.body.amount);
      if (BigInt(_amount) == balance) {
        sendUtxoList.push({
          amount: balance,
          originAmount: _amount,
          sid: assetItem.sid,
          utxo: { ...assetItem.utxo },
          ownerMemo: assetItem.ownerMemo,
          memoData: assetItem.memoData,
        });
        break;
      }
    }
  }

  let inputAmount = BigInt(0);
  const inputParametersList = [];
  for (const item of sendUtxoList) {
    inputAmount = BigInt(Number(inputAmount) + Number(item.originAmount));
    const assetRecord = ledger.ClientAssetRecord.from_json(item.utxo);
    const txoRef = ledger.TxoRef.absolute(BigInt(item.sid));
    const inputParameters = {
      txoRef,
      assetRecord,
      ownerMemo: item?.ownerMemo,
      amount: item.amount,
      memoData: item.memoData,
      sid: item.sid,
    };
    inputParametersList.push(inputParameters);
  }

  for (const inputParameters of inputParametersList) {
    const { txoRef, assetRecord, amount, ownerMemo } = inputParameters;
    utxoNumbers = utxoNumbers + BigInt(amount.toString());
    transferOp = transferOp.add_input_no_tracing(txoRef, assetRecord, ownerMemo, wallet.keypair, amount);
  }
  recieversInfo.forEach((reciverInfo) => {
    const { utxoNumbers, toPublickey, assetBlindRules } = reciverInfo;
    const blindIsAmount = assetBlindRules?.isAmountBlind;
    const blindIsType = assetBlindRules?.isTypeBlind;
    transferOp = transferOp.add_output_no_tracing(utxoNumbers, toPublickey, assetCode, !!blindIsAmount, !!blindIsType);
  });
  return transferOp;
}

async function sendUtxoToEvm({ wallet, convertAmount, assetCode }) {
  const assetBlindRules = {
    isAmountBlind: false,
    isTypeBlind: false,
  };

  const address = ledger.base64_to_bech32(ledger.get_coinbase_address());
  const publickey = ledger.bech32_to_base64(address);
  const recieversInfo = [{
    toPublickey: ledger.public_key_from_base64(publickey),
    utxoNumbers: convertAmount,
    assetBlindRules,
  }];
  let transferOp = ledger.TransferOperationBuilder.new();
  transferOp = await createReceivedTransferOperation(wallet, recieversInfo, assetCode, transferOp);

  const fraAssetCode = ledger.fra_get_asset_code();
  const feeInfos = [{
    utxoNumbers: ledger.fra_get_minimal_fee(),
    toPublickey: ledger.fra_get_dest_pubkey(),
  }];
  transferOp = await createReceivedTransferOperation(wallet, feeInfos, fraAssetCode, transferOp);
  return transferOp.create().sign(wallet.keypair).transaction();
}

async function barToFrc20 (sender, amount, recipient, assetCode = '') {
  const wallet = {
    address: sender.address,
    publickey: sender.publickey,
    keypair: ledger.create_keypair_from_secret(`"${sender.privateKey}"`),
  };

  const fraAssetCode = ledger.fra_get_asset_code();
  const mainAssetCode = assetCode || fraAssetCode;

  let transactionBuilder = await getTransactionBuilder();
  const asset = await getAssetToken(mainAssetCode);
  const decimals = asset.properties.asset_rules.decimals;

  const convertAmount = BigInt(new BigNumber(amount).times(10 ** decimals).toString(10));
  const receivedTransferOperation = await sendUtxoToEvm({ wallet, convertAmount, assetCode: mainAssetCode });
  const params = [wallet.keypair, recipient, convertAmount, mainAssetCode];

  transactionBuilder = transactionBuilder.add_transfer_operation(receivedTransferOperation);
  transactionBuilder = transactionBuilder.add_operation_convert_account(...params);
  transactionBuilder = transactionBuilder.sign(wallet.keypair);

  const submitHandle = await submitTransaction(transactionBuilder.transaction());

  await sleep(10000);

  let hash = '';
  let log = '';
  while (!hash) {
    const txnResponse = await getHashSwap(submitHandle);
    const txn = txnResponse.result.txs[0] || {};
    hash = txn.hash || '';
    log = txn.tx_result?.log ?? '';
  }

  console.log(`hash: ${hash}, log: ${log}`);
  return [hash, log]
};

module.exports = barToFrc20;
