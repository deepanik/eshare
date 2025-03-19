require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      chainId: 1337
    },
    // Add other networks as needed
    // polygon: {
    //   url: process.env.POLYGON_RPC_URL,
    //   accounts: [process.env.PRIVATE_KEY]
    // }
  },
  paths: {
    sources: "./contracts",
    artifacts: "./src/artifacts",
  },
}; 