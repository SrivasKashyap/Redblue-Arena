require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    amoy: {
      url: process.env.AMOY_RPC_URL || '',
      accounts: process.env.SERVICE_WALLET_PRIVATE_KEY
        ? [process.env.SERVICE_WALLET_PRIVATE_KEY]
        : [],
      chainId: 80002,
    },
  },
};
