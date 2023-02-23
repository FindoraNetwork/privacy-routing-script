const sleep = require('sleep-promise');
const ledger = require('../wasm');
const { getTransactionBuilder, findSidforBarToAbarFee, getOwnedUtxo } = require('./services');
const { submitTransaction, getHashSwap } = require('./apis');

async function barToAbar (sender, receiver, seeds = [], sids = []) {
  let transactionBuilder = await getTransactionBuilder();
  const { sid: feeSid } = await findSidforBarToAbarFee(sids);
  const keypair = ledger.keypair_from_str(sender.keyStore);
  const abarSeeds = [...seeds];

  const utxos = await Promise.all(sids.map(getOwnedUtxo));

  for (const utxoItem of utxos) {
    const { utxo, ownerMemoData, sid } = utxoItem;

    const ownerMemo = ownerMemoData ? ledger.AxfrOwnerMemo.from_json(ownerMemoData) : null;
    const assetRecord = ledger.ClientAssetRecord.from_json(utxo);

    const axfrPublicKey = ledger.axfr_pubkey_from_string(receiver.axfrPublicKey);

    if (sid === feeSid) {
      let feeInputs = ledger.FeeInputs.new();
      const feeAmount = BigInt(utxo.record.amount['NonConfidential']);
      const txoRef = ledger.TxoRef.absolute(BigInt(feeSid));
      feeInputs = feeInputs.append2(feeAmount, txoRef, assetRecord, ownerMemo?.clone(), keypair);
      transactionBuilder = transactionBuilder.add_fee_bar_to_abar(feeInputs);
    } else {
      transactionBuilder = transactionBuilder.add_operation_bar_to_abar(
        abarSeeds.shift(),
        keypair,
        axfrPublicKey,
        BigInt(sid),
        assetRecord,
        ownerMemo?.clone(),
      );
    }
  }
  const commitments = transactionBuilder?.get_commitments().commitments;

  transactionBuilder = transactionBuilder.build();
  transactionBuilder = transactionBuilder.sign(keypair);

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
  return [commitments, hash, log]
};

module.exports = barToAbar;
