// Plugins
require('@nomiclabs/hardhat-ethers')

// Load environment variables from .env
require('dotenv').config();


const words = process.env.MNEMONIC.match(/[a-zA-Z]+/g).length
validLength = [12, 15, 18, 24]
if (!validLength.includes(words)) {
   console.log(`The mnemonic (${process.env.MNEMONIC}) is the wrong number of words`)
   process.exit(-1)
}

module.exports = {
  networks: {
    'patex-sepolia': {
      chainId: 471100,
      url: `https://test-rpc.patex.io`,
      accounts: { mnemonic: process.env.MNEMONIC }
    },
    'sepolia': {
      chainId: 11155111,
      url: process.env.L1_RPC_URL,
      accounts: { mnemonic: process.env.MNEMONIC }
    }
  },
  solidity: '0.8.13',
}
