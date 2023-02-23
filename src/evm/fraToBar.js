const Web3 = require('web3');
const BigNumber = require('bignumber.js');

const PrismBridgeAbi = require('../contracts/PrismBridgeAbi.json');
const { fraAddressToHashAddress } = require('../utils');

async function fraToBar (from, receipt, amount) {
  const { RPC_URL, PRIVATE_KEY, PRISM_BRIDGE_ADDRESS } = process.env;
  const web3 = new Web3(RPC_URL);

  const prismBridge = new web3.eth.Contract(PrismBridgeAbi, PRISM_BRIDGE_ADDRESS);
  const findoraTo = fraAddressToHashAddress(receipt);
  const calldata = prismBridge.methods.depositFRA(findoraTo).encodeABI();

  const bar2abarFee = 0.02 * (10 ** 18);
  const bar2Frc20Fee = 0.01 * (10 ** 18);
  for (const value of [bar2abarFee, bar2Frc20Fee]) {
    try {
      const { rawTransaction } = await web3.eth.accounts.signTransaction({
        to: PRISM_BRIDGE_ADDRESS,
        data: calldata,
        from,
        gas: '850000',
        value: BigInt(value).toString()
      }, PRIVATE_KEY);
      const receipt = await web3.eth.sendSignedTransaction(rawTransaction);
      console.log('deposit fee:', receipt.transactionHash)
    } catch (error) {
      console.log(error);
    }
  }

  try {
    const { rawTransaction } = await web3.eth.accounts.signTransaction({
      to: PRISM_BRIDGE_ADDRESS,
      data: calldata,
      from,
      gas: '850000',
      value: BigInt(new BigNumber(amount).times(10 ** 18).toString()).toString()
    }, PRIVATE_KEY);
    const receipt = await web3.eth.sendSignedTransaction(rawTransaction);
    console.log('deposit amount:', receipt.transactionHash)
  } catch (error) {
    console.log(error);
  }
}

module.exports = fraToBar;
