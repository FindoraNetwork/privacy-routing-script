const ledger = require('../wasm');

function createWallet () {
  const keypair = ledger.new_keypair();
  const keypairStr = ledger.keypair_to_str(keypair);
  return {
    keyStore: keypairStr,
    keypair: keypair,
    privateKey: ledger.get_priv_key_str(keypair).replace(/\"/g, ''),
    publickey: ledger.get_pub_key_str(keypair).replace(/\"/g, ''),
    address: ledger.public_key_to_bech32(ledger.get_pk_from_keypair(keypair)),
  };
}

function createAnonWallet () {
  const anonKeys = ledger.gen_anon_keys();
  const axfrPublicKey = anonKeys.pub_key;
  const axfrSpendKey = anonKeys.spend_key;
  const axfrViewKey = anonKeys.view_key;

  const formattedAnonKeys = {
    axfrPublicKey,
    axfrSpendKey,
    axfrViewKey,
  };

  try {
    anonKeys.free();
  } catch (error) {
    throw new Error(`could not get release the anonymous keys instance  "${error.message}" `);
  }
  return formattedAnonKeys;
}

module.exports = {
  createWallet,
  createAnonWallet
}
