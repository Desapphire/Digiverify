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
const approveProperty = async (propertyId, reason = null) => {
    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found.', 404);

    if (property.status === 'active') {
        throw new AppError('Property is already active.', 400);
    }

    // 1. Update status in DB
    const updatedProperty = await Property.updateStatus(propertyId, 'active', reason);

    // 2. Register Property on-chain (first step of blockchain lifecycle)
    console.log(`Registering property ${property.propertyCode} on-chain (authority approval) ...`);
    await contractService.registerPropertyOnChain(
        property.propertyCode,
        property.ownerWallet,
        property.documentHash || 'QmDefaultHash'
    );

    // 3. Approve Property on-chain (mints NFT)
    let txHash = null;
    const metadataURI = `https://localhost:5000/api/properties/${propertyId}`;
    const result = await contractService.approvePropertyOnChain(
        property.propertyCode,
        metadataURI
    );
    txHash = result.txHash;

    if (result.tokenId) {
        await Property.setNftTokenId(propertyId, result.tokenId);
        console.log(`NFT Minted for property ${propertyId}: TokenID ${result.tokenId}, Tx: ${txHash}`);
    }

    return { property: updatedProperty, txHash };
};

/**
 * Reject a property registration.
 */
const rejectProperty = async (propertyId, reason = null) => {
    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found.', 404);

    if (property.status !== 'pending' && property.status !== 'registered') {
        throw new AppError('Only pending or registered properties can be rejected.', 400);
    }

    return Property.updateStatus(propertyId, 'rejected', reason);
};

/**
 * Approve a sale transaction (authority signature).
 */
const approveSaleTransaction = async (saleId, authorityWallet, signatureHash, reason = null) => {
    const sale = await SaleTransaction.findById(saleId);
    if (!sale) throw new AppError('Sale transaction not found.', 404);

    // 1. Progress on-chain state by Authority
    let txHash = null;
    if (sale.onChainId) {
        try {
            // Re-fetch sale to get latest status if needed
            // (Assuming sale.buyerSigned is true in DB since we are in approve flow)
            
            // Try to call buyerSign if not already done on-chain
            if (sale.buyerSigned) {
                try {
                    console.log(`Fallback: Ensuring BuyerSign on-chain for SaleID: ${sale.onChainId}...`);
                    await contractService.buyerSignOnChain(sale.onChainId);
                } catch (e) {
                    // Ignore if already signed or other non-critical error
                    console.log(`ℹ️ On-chain BuyerSign check: ${e.message}`);
                }
            }

            // Note: confirmFundsBlocked must have been called by Bank earlier.
            // If it failed on-chain, we can't easily fix it here without BANK_ROLE.
            
            console.log(`Executing AuthorityApprove on-chain for SaleID: ${sale.onChainId}...`);
            const result = await contractService.authorityApproveOnChain(sale.onChainId);
            txHash = result.hash;
            console.log(`On-chain sale approval successful for SaleID: ${sale.onChainId}, Tx: ${txHash}`);
        } catch (err) {
            // If it fails with "Funds must be blocked first", it means Bank confirmation is missing on-chain
            console.warn(`On-chain approval failed: ${err.message}`);
        }
    }

    // 2. Record approval in DB
    let finalSignatureHash = signatureHash;
    if (!finalSignatureHash) {
        try {
            const { getSigner } = require('../config/blockchain');
            const signer = getSigner();
            if (signer) {
                console.log(`Backend signing for Authority Approval (SaleID: ${saleId})...`);
                // Sign the saleId as proof of approval
                finalSignatureHash = await signer.signMessage(`Authority Approve Sale: ${saleId}`);
            }
        } catch (err) {
            console.warn('Backend signing failed:', err.message);
        }
    }

    const updatedSale = await saleService.approveSale(saleId, authorityWallet, finalSignatureHash, reason);
    return { sale: updatedSale, txHash };
};

/**
 * Reject a sale transaction.
 */
const rejectSaleTransaction = async (saleId, reason = null) => {
    const sale = await SaleTransaction.findById(saleId);
    if (!sale) throw new AppError('Sale transaction not found.', 404);
    saleService.validateTransition(sale.status, 'cancelled');
    return SaleTransaction.updateStatus(saleId, 'cancelled', reason);
};

/**
 * Set encumbrance on a property.
 */
const setEncumbrance = async (propertyId, flag, reason = null) => {
    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found.', 404);
    return Property.setEncumbrance(propertyId, flag, reason);
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
    rejectProperty,
};
