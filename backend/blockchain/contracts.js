/**
 * Smart Contract Instances — Loads ABIs and creates Ethers.js contract objects for all 8 DigiVerify contracts.
 */

const { ethers } = require('ethers');
const { getProvider, getSigner, contractAddresses } = require('../config/blockchain');

// ABIs compiled from Hardhat
const LandNFT_ABI = require('./abis/LandNFT.json');
const LandRegistry_ABI = require('./abis/LandRegistry.json');
const SaleContract_ABI = require('./abis/SaleContract.json');
const CourtOverride_ABI = require('./abis/CourtOverride.json');
const BankLienRegistry_ABI = require('./abis/BankLienRegistry.json');
const InheritanceSuccession_ABI = require('./abis/InheritanceSuccession.json');
const PropertyTaxVault_ABI = require('./abis/PropertyTaxVault.json');
const CitizenIdentityRegistry_ABI = require('./abis/CitizenIdentityRegistry.json');

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

    if (contractAddresses.bankLienRegistry) {
        contracts.bankLienRegistry = new ethers.Contract(
            contractAddresses.bankLienRegistry,
            BankLienRegistry_ABI,
            signerOrProvider
        );
    }

    if (contractAddresses.inheritanceSuccession) {
        contracts.inheritanceSuccession = new ethers.Contract(
            contractAddresses.inheritanceSuccession,
            InheritanceSuccession_ABI,
            signerOrProvider
        );
    }

    if (contractAddresses.propertyTaxVault) {
        contracts.propertyTaxVault = new ethers.Contract(
            contractAddresses.propertyTaxVault,
            PropertyTaxVault_ABI,
            signerOrProvider
        );
    }

    if (contractAddresses.citizenIdentityRegistry) {
        contracts.citizenIdentityRegistry = new ethers.Contract(
            contractAddresses.citizenIdentityRegistry,
            CitizenIdentityRegistry_ABI,
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

module.exports = {
    initContracts,
    getContracts,
    LandNFT_ABI,
    LandRegistry_ABI,
    SaleContract_ABI,
    CourtOverride_ABI,
    BankLienRegistry_ABI,
    InheritanceSuccession_ABI,
    PropertyTaxVault_ABI,
    CitizenIdentityRegistry_ABI
};
