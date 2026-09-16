require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const FUJI_RPC = process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc";
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.28",
        settings: {
            optimizer: { enabled: true, runs: 200 },
            viaIR: true,
            evmVersion: "cancun",
        },
    },
    networks: {
        fuji: {
            url: FUJI_RPC,
            chainId: 43113,
            accounts: [DEPLOYER_KEY],
            gasPrice: 25000000000, // 25 gwei
        },
        sepolia: {
            url: SEPOLIA_RPC,
            chainId: 11155111,
            accounts: [DEPLOYER_KEY],
            gasPrice: "auto",
        },
    },
    paths: {
        sources: "./contracts",
        artifacts: "./artifacts",
    },
};
