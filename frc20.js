const Web3 = require('web3');

const { createWallet, createAnonWallet } = require('./src/wallet');
const { getOwnedSids } = require('./src/findora/apis');
const { getAssetCode } = require('./src/findora/services');
const { generateSeedString } = require('./src/utils');
const frc20ToBar = require('./src/evm/frc20ToBar');
const barToAbar = require('./src/findora/barToAbar');
const abarToBar = require('./src/findora/abarToBar');
const barToFrc20 = require('./src/findora/barToFrc20');

async function run() {
  const { RPC_URL, PRIVATE_KEY, RECIPIENT } = process.env;
  const web3 = new Web3(RPC_URL);
  const BN = web3.utils.BN;
  const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);

  const walletStart = createWallet();
  const walletEnd = createWallet();
  const anonWallet = createAnonWallet();
  const amount = 2;

  console.log('Send FRC20 token to Findora Native Chain');
  await frc20ToBar(account.address, walletStart.address, amount);

  let sids = [];
  while (sids.length <= 0) {
    sids = await getOwnedSids(walletStart.publickey);
  }

  console.log('Convert assets from BAR to ABAR in Findora Native Chain (entering anonymous cycle)');
  const seeds = [];
  while (seeds.length < 2) {
    const seedStr = generateSeedString();
    !seeds.includes(seedStr) && seeds.push(seedStr);
  }
  const [commitments] = await barToAbar(walletStart, anonWallet, seeds, sids);

  console.log('Convert assets from ABAR to BAR in Findora Native Chain (leaving anonymous cycle)');
  await abarToBar(anonWallet, walletEnd, commitments);

  console.log('Withdraw assets from Findora Native Chain to Findora EVM');
  const assetCode = await getAssetCode();
  await barToFrc20(walletEnd, amount, RECIPIENT, assetCode);
}
run();


// console.log(account)
// simBridge.methods.bar2abarFee().call().then(console.log)
// simBridge.methods.convertFee().call().then(console.log)
// simBridge.methods.depositFRA(findoraTo).encodeABI()
// // const provider = new ethers.providers.JsonRpcProvider();
// const provider = new ethers.JsonRpcProvider(forgeRpc)
// console.log(provider);

// const wallet = new ethers.Wallet(privateKey, provider);
// console.log(wallet);
