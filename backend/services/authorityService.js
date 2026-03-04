/**
 * Authority Service — Government authority actions.
 */

const Property = require('../models/Property');
const SaleTransaction = require('../models/SaleTransaction');
const saleService = require('./saleService');
const contractService = require('../blockchain/contractService');
const { ethers } = require('ethers');
const AppError = require('../utils/AppError');

/**
 * Approve a property registration.
 */
const approveProperty = async (propertyId) => {
    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found.', 404);

    if (property.status === 'active') {
        throw new AppError('Property is already active.', 400);
    }

    // 1. Update status in DB
    const updatedProperty = await Property.updateStatus(propertyId, 'active');

    // 2. Approve Property on-chain (mints NFT)
    let txHash = null;
    try {
        const metadataURI = `https://digiverify.gov/api/properties/${propertyId}`;
        const result = await contractService.approvePropertyOnChain(
            property.propertyCode,
            metadataURI
        );
        txHash = result.txHash;

        if (result.tokenId) {
            await Property.setNftTokenId(propertyId, result.tokenId);
            console.log(`✅ NFT Minted for property ${propertyId}: TokenID ${result.tokenId}, Tx: ${txHash}`);
        }
    } catch (err) {
        console.error(`⚠️ Blockchain approval failed for property ${propertyId}:`, err.message);
    }

    return { property: updatedProperty, txHash };
};

/**
 * Approve a sale transaction (authority signature).
 */
const approveSaleTransaction = async (saleId, authorityWallet, signatureHash) => {
    const sale = await SaleTransaction.findById(saleId);
    if (!sale) throw new AppError('Sale transaction not found.', 404);

    // 1. Sign on-chain by Authority
    let txHash = null;
    if (sale.onChainId) {
        try {
            const result = await contractService.authorityApproveOnChain(sale.onChainId);
            txHash = result.hash;
            console.log(`✅ On-chain sale approval successful for SaleID: ${sale.onChainId}, Tx: ${txHash}`);
        } catch (err) {
            console.error(`⚠️ On-chain sale approval failed:`, err.message);
        }
    }

    const updatedSale = await saleService.approveSale(saleId, authorityWallet, signatureHash);
    return { sale: updatedSale, txHash };
};

/**
 * Reject a sale transaction.
 */
const rejectSaleTransaction = async (saleId) => {
    const sale = await SaleTransaction.findById(saleId);
    if (!sale) throw new AppError('Sale transaction not found.', 404);
    saleService.validateTransition(sale.status, 'cancelled');
    return SaleTransaction.updateStatus(saleId, 'cancelled');
};

/**
 * Set encumbrance on a property.
 */
const setEncumbrance = async (propertyId, flag) => {
    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found.', 404);
    return Property.setEncumbrance(propertyId, flag);
};

/**
 * Confirm funds are blocked (bank verification by authority).
 */
const confirmFundsBlocked = async (saleId) => {
    const sale = await SaleTransaction.findById(saleId);
    if (!sale) throw new AppError('Sale transaction not found.', 404);

    if (!sale.fundsBlocked) {
        throw new AppError('Funds are not yet blocked.', 400);
    }

    return sale;
};

module.exports = {
    approveProperty,
    approveSaleTransaction,
    rejectSaleTransaction,
    setEncumbrance,
    confirmFundsBlocked,
};
