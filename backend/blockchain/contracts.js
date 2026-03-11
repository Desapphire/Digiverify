/**
 * Smart Contract Instances — Loads ABIs and creates Ethers.js contract objects.
 */

const { ethers } = require('ethers');
const { getProvider, getSigner, contractAddresses } = require('../config/blockchain');

// Placeholder ABIs — replace with actual ABIs from deployed contracts
const LandNFT_ABI = require('./abis/LandNFT.json');
const LandRegistry_ABI = require('./abis/LandRegistry.json');
const SaleContract_ABI = require('./abis/SaleContract.json');
const CourtOverride_ABI = require('./abis/CourtOverride.json');

let contracts = {};

/**
 * Initialize contract instances.
 * Uses signer for write operations if available, otherwise read-only via provider.
 */
const initContracts = () => {
    const signerOrProvider = getSigner() || getProvider();

    if (contractAddresses.landNFT) {
        contracts.landNFT = new ethers.Contract(
            contractAddresses.landNFT,
            LandNFT_ABI,
            signerOrProvider
        );
    }

    if (contractAddresses.landRegistry) {
        contracts.landRegistry = new ethers.Contract(
            contractAddresses.landRegistry,
            LandRegistry_ABI,
            signerOrProvider
        );
    }

    if (contractAddresses.saleContract) {
        contracts.saleContract = new ethers.Contract(
            contractAddresses.saleContract,
            SaleContract_ABI,
            signerOrProvider
        );
    }

    if (contractAddresses.courtOverride) {
        contracts.courtOverride = new ethers.Contract(
            contractAddresses.courtOverride,
            CourtOverride_ABI,
            signerOrProvider
        );
    }

    return contracts;
};

const getContracts = () => {
    if (Object.keys(contracts).length === 0) {
        initContracts();
    }
    return contracts;
};

module.exports = { initContracts, getContracts };
