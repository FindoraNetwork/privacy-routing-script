
const { decode } = require('bech32-buffer');
const crypto = require('crypto');

module.exports = {
  fraAddressToHashAddress: (address) => {
    try {
      const result = decode(address).data;
      return '0x' + Buffer.from(result).toString('hex');
    } catch (error) {
      console.log(error)
    }
  },
  generateSeedString: () => {
    let seed = '';
    const randomVals = new Uint8Array(32);
    const myCrypto = crypto.webcrypto;
    myCrypto.getRandomValues(randomVals);
    randomVals.forEach(num => {
      const hex = num.toString(16);
      seed += hex.length === 1 ? `0${hex}` : hex;
    });
    return seed;
  }
}
