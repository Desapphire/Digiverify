/**
 * Contract Service — High-level blockchain operations for the 4-contract system.
 */

const { getContracts } = require('./contracts');
const { ethers } = require('ethers');

/**
 * ── Property Workflow ────────────────────────────────────
 */

/**
 * Submit property registration to LandRegistry.
 */
const registerPropertyOnChain = async (propertyCode, ownerAddress, documentHash) => {
    const { landRegistry } = getContracts();
    if (!landRegistry) return { txHash: null };

    try {
        const tx = await landRegistry.registerProperty(propertyCode, ownerAddress, documentHash);
        const receipt = await tx.wait();
        return { txHash: receipt.hash };
    } catch (err) {
        console.error('Property registration on-chain failed:', err.message);
        throw err;
    }
};

/**
 * Approve property registration (mints NFT).
 */
const approvePropertyOnChain = async (propertyCode, metadataURI) => {
    const { landRegistry } = getContracts();
    if (!landRegistry) return { tokenId: null, txHash: null };

    try {
        const tx = await landRegistry.approveProperty(propertyCode, metadataURI);
        const receipt = await tx.wait();

        // Find PropertyApproved event to get tokenId
        const log = receipt.logs.find(x => x.fragment?.name === 'PropertyApproved');
        const tokenId = log?.args?.[1]?.toString();

        return { tokenId, txHash: receipt.hash };
    } catch (err) {
        console.error('Property approval on-chain failed:', err.message);
        throw err;
    }
};

/**
 * ── Sale Workflow (Multi-sig) ───────────────────────────
 */

/**
 * Initiate a sale on SaleContract.
 */
const registerOnChainSale = async (tokenId, propertyCode, seller, buyer, price) => {
    const { saleContract } = getContracts();
    if (!saleContract) return { txHash: null };

    try {
        const tx = await saleContract.initiateSale(tokenId, propertyCode, seller, buyer, price);
        const receipt = await tx.wait();

        // Extract saleId from logs if needed
        const log = receipt.logs.find(x => x.fragment?.name === 'SaleInitiated');
        const saleId = log?.args?.[0]?.toString();

        return { saleId, txHash: receipt.hash };
    } catch (err) {
        console.error('Sale initiation on-chain failed:', err.message);
        throw err;
    }
};

const buyerSignOnChain = async (saleId) => {
    const { saleContract } = getContracts();
    const tx = await saleContract.buyerSign(saleId);
    return tx.wait();
};

const confirmFundsBlockedOnChain = async (saleId) => {
    const { saleContract } = getContracts();
    const tx = await saleContract.confirmFundsBlocked(saleId);
    return tx.wait();
};

const authorityApproveOnChain = async (saleId) => {
    const { saleContract } = getContracts();
    const tx = await saleContract.authorityApprove(saleId);
    return tx.wait();
};

/**
 * Finalize transfer.
 */
const completeOnChainSale = async (saleId) => {
    const { saleContract } = getContracts();
    if (!saleContract) return { txHash: null };

    try {
        const tx = await saleContract.executeTransfer(saleId);
        const receipt = await tx.wait();
        return { txHash: receipt.hash };
    } catch (err) {
        console.error('On-chain sale completion failed:', err.message);
        throw err;
    }
};

/**
 * ── Judicial Workflow (CourtOverride) ───────────────────
 */

const courtFreezeProperty = async (propertyId, reason) => {
    const { courtOverride } = getContracts();
    const tx = await courtOverride.freezeProperty(propertyId, reason);
    return tx.wait();
};

const courtReverseTransfer = async (propertyId, previousOwner, reason) => {
    const { courtOverride } = getContracts();
    const tx = await courtOverride.reverseTransfer(propertyId, previousOwner, reason);
    return tx.wait();
};

const courtCancelSale = async (saleId, reason) => {
    const { courtOverride } = getContracts();
    const tx = await courtOverride.cancelSale(saleId, reason);
    return tx.wait();
};

module.exports = {
    registerPropertyOnChain,
    approvePropertyOnChain,
    registerOnChainSale,
    buyerSignOnChain,
    confirmFundsBlockedOnChain,
    authorityApproveOnChain,
    completeOnChainSale,
    courtFreezeProperty,
    courtReverseTransfer,
    courtCancelSale,
    // Keep legacy aliases for compatibility during transition if needed
    mintLandNFT: approvePropertyOnChain
};
