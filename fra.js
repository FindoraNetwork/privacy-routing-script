const Web3 = require('web3');

const { createWallet, createAnonWallet } = require('./src/wallet');
const { getOwnedSids } = require('./src/findora/apis');
const { generateSeedString } = require('./src/utils');

const fraToBar = require('./src/evm/fraToBar');
const barToAbar = require('./src/findora/barToAbar');
const abarToBar = require('./src/findora/abarToBar');
const barToFrc20 = require('./src/findora/barToFrc20');

async function run() {
  const { RPC_URL, PRIVATE_KEY, RECIPIENT } = process.env;
  const web3 = new Web3(RPC_URL);
  const BN = web3.utils.BN;
  const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
  console.log('account address: ', account.address);

  const walletStart = createWallet();
  const walletEnd = createWallet();
  const anonWallet = createAnonWallet();
  const amount = 2;

  console.log('Send FRA token to Findora Native Chain');
  await fraToBar(account.address, walletStart.address, amount);

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
  await barToFrc20(walletEnd, amount, RECIPIENT);
}

run();
