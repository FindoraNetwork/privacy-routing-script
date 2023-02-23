const Web3 = require('web3');
const BigNumber = require('bignumber.js');

const PrismBridgeAbi = require('../contracts/PrismBridgeAbi.json');
const ledger = require('../wasm');
const { getStateCommitment, getUtxo, getOwnerMemo, getOwnedAbars } = require('./apis');

async function getTransactionBuilder (data) {
  try {
    if (data) {
      return ledger.TransactionBuilder.from_string(data);
    }
    const stateCommitment = await getStateCommitment();
    const [_, height] = stateCommitment;
    const blockCount = BigInt(height);
    return ledger.TransactionBuilder.new(BigInt(blockCount));
  } catch (error) {
    console.log(error);
  }
};

async function getOwnedUtxo (sid) {
  const utxoData = await getUtxo(sid);
  const isBlindType = utxoData.utxo.record.asset_type?.Confidential ? true : false;
  const isBlindMount = utxoData.utxo.record.amount?.Confidential ? true : false;
  const memoDataResult = await getOwnerMemo(sid);
  return { utxo: utxoData.utxo, sid, isBlindType, isBlindMount, ownerMemoData: memoDataResult };
}

async function findSidforBarToAbarFee (sids = []) {
  const fra = ledger.fra_get_asset_code();
  const feeAmount = ledger.fra_get_minimal_fee_for_bar_to_abar();
  for (const sid of sids) {
    const { utxo } = await getOwnedUtxo(sid);
    const assetType = ledger.asset_type_from_jsvalue(utxo.record.asset_type['NonConfidential']);
    const assetAmount = utxo.record.amount['NonConfidential'];
    if (assetType === fra && BigInt(assetAmount) === feeAmount) {
      return { sid };
    }
  }
  return {};
};

async function getOwnedAbar (commitment) {
  const ownedAbarsResponse = await getOwnedAbars(commitment);
  const [atxoSid, ownedAbar] = ownedAbarsResponse;
  return {
    commitment,
    abarData: {
      atxoSid,
      ownedAbar: { ...ownedAbar },
    },
  };
}

async function getAssetCode () {
  const { RPC_URL, FRC20_ADDRESS, PRISM_BRIDGE_ADDRESS } = process.env;
  const web3 = new Web3(RPC_URL);

  const prismBridge = new web3.eth.Contract(PrismBridgeAbi, PRISM_BRIDGE_ADDRESS);
  const assetHex = await prismBridge.methods.computeERC20AssetType(FRC20_ADDRESS).call();
  const assetCode = Buffer.from(Web3.utils.hexToBytes(assetHex))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return assetCode;
}

module.exports = {
  getTransactionBuilder,
  findSidforBarToAbarFee,
  getOwnedUtxo,
  getOwnedAbar,
  getAssetCode
}
