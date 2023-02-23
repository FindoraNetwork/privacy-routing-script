const sleep = require('sleep-promise');

const ledger = require('../wasm');
const { getTransactionBuilder, getOwnedAbar } = require('./services');
const { submitTransaction, getHashSwap, getAbarOwnerMemo, getMTLeafInfo } = require('./apis');

async function abarToBar (sender, receiver, commitments) {
  let transactionBuilder = await getTransactionBuilder();
  const ownedAbarToUseAsSources = await Promise.all(commitments.map(getOwnedAbar));

  const aXfrSpendKeySender = ledger.axfr_keypair_from_string(sender.axfrSpendKey);

  for (const ownedAbarToUseAsSource of ownedAbarToUseAsSources) {
    const { abarData: { atxoSid, ownedAbar } } = ownedAbarToUseAsSource;

    const receiverXfrPublicKey = ledger.public_key_from_base64(receiver.publickey);
    const myOwnedAbar = ledger.abar_from_json(ownedAbar);

    const [myMemoData, mTLeafInfo] = await Promise.all([getAbarOwnerMemo(atxoSid), getMTLeafInfo(atxoSid)]);

    const abarOwnerMemo = ledger.AxfrOwnerMemo.from_json(myMemoData);
    const myMTLeafInfo = ledger.MTLeafInfo.from_json(mTLeafInfo);

    transactionBuilder = transactionBuilder.add_operation_abar_to_bar(
      myOwnedAbar,
      abarOwnerMemo,
      myMTLeafInfo,
      aXfrSpendKeySender,
      receiverXfrPublicKey,
      false,
      false,
    );
  }
  transactionBuilder = transactionBuilder.build();

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
}

module.exports = abarToBar;
