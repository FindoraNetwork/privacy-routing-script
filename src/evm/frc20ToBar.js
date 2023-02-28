const Web3 = require('web3');
const BigNumber = require('bignumber.js');

const PrismBridgeAbi = require('../contracts/PrismBridgeAbi.json');
const Erc20Abi = require('../contracts/Erc20Abi.json');
const { fraAddressToHashAddress } = require('../utils');

async function frc20ToBar (from, receipt, amount) {
  const { RPC_URL, PRIVATE_KEY, PRISM_BRIDGE_ADDRESS, PRISM_BRIDGE_LEDGER_ADDRESS, FRC20_ADDRESS } = process.env;
  const web3 = new Web3(RPC_URL);

  const prismBridge = new web3.eth.Contract(PrismBridgeAbi, PRISM_BRIDGE_ADDRESS);
  const erc20 = new web3.eth.Contract(Erc20Abi, FRC20_ADDRESS);

  const decimals = await erc20.methods.decimals().call();
  const amountWei = new BigNumber(amount).times(10 ** decimals);
  const findoraTo = fraAddressToHashAddress(receipt);

  //** Approve Token */
  try {
    const approveCallData = erc20.methods.approve(PRISM_BRIDGE_LEDGER_ADDRESS, amountWei.toString()).encodeABI();
    const { rawTransaction } = await web3.eth.accounts.signTransaction({
      to: FRC20_ADDRESS,
      data: approveCallData,
      from,
      gas: '850000',
    }, PRIVATE_KEY);
    const receipt = await web3.eth.sendSignedTransaction(rawTransaction);
    console.log('approve:', receipt.transactionHash)
  } catch (error) {
    console.log('approve error:',error);
  }

  //** Approve Token */
  const bar2abarFee = 0.02 * (10 ** 18);
  const bar2Frc20Fee = 0.01 * (10 ** 18);
  const feeCalldata = prismBridge.methods.depositFRA(findoraTo).encodeABI();
  for (const fee of [bar2abarFee, bar2Frc20Fee]) {
    try {
      const gas = await prismBridge.methods.depositFRA(findoraTo).estimateGas({ from, value: BigInt(fee).toString() });
      const { rawTransaction } = await web3.eth.accounts.signTransaction({
        to: PRISM_BRIDGE_ADDRESS,
        data: feeCalldata,
        from,
        gas,
        value: BigInt(fee).toString()
      }, PRIVATE_KEY);
      const receipt = await web3.eth.sendSignedTransaction(rawTransaction);
      console.log('deposit fee:', receipt.transactionHash);
    } catch (error) {
      console.log('deposit fee error:', error)
    }
  }

  const tokenCalldata = prismBridge.methods.depositFRC20(FRC20_ADDRESS, findoraTo, amountWei).encodeABI();
  try {
    const gas = await prismBridge.methods.depositFRC20(FRC20_ADDRESS, findoraTo, amountWei).estimateGas({ from });
    const { rawTransaction } = await web3.eth.accounts.signTransaction({
      to: PRISM_BRIDGE_ADDRESS,
      data: tokenCalldata,
      from,
      gas,
    }, PRIVATE_KEY);
    const receipt = await web3.eth.sendSignedTransaction(rawTransaction);
    console.log('deposit token:', receipt.transactionHash);
    return receipt.transactionHash;
  } catch (error) {
    console.log('deposit token error:', error);
  }
  return '';
}

module.exports = frc20ToBar;
