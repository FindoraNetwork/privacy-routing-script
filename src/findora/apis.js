const axios = require('axios');
const JSONbig = require('json-bigint');

const _axios = axios.create({});
_axios.defaults.transformResponse = [
  (data) => {
    try {
      return JSONbig({ useNativeBigInt: true }).parse(data);
    } catch (_) {
      return data;
    }
  },
];

async function getStateCommitment () {
  const { RPC_URL } = process.env;
  const url = `${RPC_URL.slice(0, -5)}:8668/global_state`;
  try {
    const response = await _axios.get(url);
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

async function getUtxo (sid) {
  const { RPC_URL } = process.env;
  const url = `${RPC_URL.slice(0, -5)}:8668/utxo_sid/${sid}`;
  try {
    const response = await _axios.get(url);
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

async function getOwnerMemo (sid) {
  const { RPC_URL } = process.env;
  const url = `${RPC_URL.slice(0, -5)}:8667/get_owner_memo/${sid}`;
  try {
    const response = await _axios.get(url);
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

async function getOwnedSids (address) {
  const { RPC_URL } = process.env;
  const url = `${RPC_URL.slice(0, -5)}:8667/get_owned_utxos/${address}`;
  try {
    const response = await _axios.get(url);
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

async function submitTransaction (data) {
  const { RPC_URL } = process.env;
  const url = `${RPC_URL.slice(0, -5)}:8669/submit_transaction`;
  try {
    const txData = JSONbig.parse(data);
    const response = await _axios.post(url, txData);
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

async function getOwnedAbars (commitment) {
  const { RPC_URL } = process.env;
  const url = `${RPC_URL.slice(0, -5)}:8667/owned_abars/${commitment}`;
  try {
    const response = await _axios.get(url);
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

async function getMTLeafInfo (atxoSid) {
  const { RPC_URL } = process.env;
  const url = `${RPC_URL.slice(0, -5)}:8667/get_abar_proof/${atxoSid}`;
  try {
    const response = await _axios.get(url);
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

async function getAbarOwnerMemo (atxoSid) {
  const { RPC_URL } = process.env;
  const url = `${RPC_URL.slice(0, -5)}:8667/get_abar_memo/${atxoSid}`;
  try {
    const response = await _axios.get(url);
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

async function getAssetToken (assetCode) {
  const { RPC_URL } = process.env;
  const url = `${RPC_URL.slice(0, -5)}:8668/asset_token/${assetCode}`;
  try {
    const response = await _axios.get(url);
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

async function getHashSwap (hash) {
  const { RPC_URL } = process.env;
  const url = `${RPC_URL.slice(0, -5)}:26657/tx_search`;
  try {
    const response = await _axios.get(url, { params: { query: `"tx.prehash='${hash}'"` } });
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

module.exports = {
  getStateCommitment,
  getUtxo,
  getOwnerMemo,
  getOwnedSids,
  getOwnedAbars,
  getMTLeafInfo,
  getAbarOwnerMemo,
  getAssetToken,
  submitTransaction,
  getHashSwap
}
