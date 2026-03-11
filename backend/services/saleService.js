/**
 * Sale Service — State machine logic for multi-sign sale workflow.
 */

const SaleTransaction = require('../models/SaleTransaction');
const Property = require('../models/Property');
const User = require('../models/User');
const FundBlock = require('../models/FundBlock');
const { withTransaction } = require('../config/db');
const { SALE_STATUS, SALE_STATE_TRANSITIONS, SALE_COMPLETION_REQUIREMENTS } = require('../config/constants');
const contractService = require('../blockchain/contractService');
const { ethers } = require('ethers');
const AppError = require('../utils/AppError');

// ── State Machine ───────────────────────────────────────
/**
 * Validate that a state transition is legal.
 */
const validateTransition = (currentStatus, newStatus) => {
    const validNext = SALE_STATE_TRANSITIONS[currentStatus];
    if (!validNext || !validNext.includes(newStatus)) {
        throw new AppError(
            `Invalid state transition: ${currentStatus} → ${newStatus}. ` +
            `Valid transitions: ${validNext ? validNext.join(', ') : 'none (terminal state)'}`,
            400
        );
    }
};

/**
 * Check if all pre-conditions for sale completion are met.
 */
const canComplete = (sale) => {
    return (
        sale.buyerSigned === SALE_COMPLETION_REQUIREMENTS.buyerSigned &&
        sale.sellerSigned === SALE_COMPLETION_REQUIREMENTS.sellerSigned &&
        sale.authoritySigned === SALE_COMPLETION_REQUIREMENTS.authoritySigned &&
        sale.fundsBlocked === SALE_COMPLETION_REQUIREMENTS.fundsBlocked
    );
};

// ── Service Methods ─────────────────────────────────────

/**
 * Initiate a new sale transaction.
 */
const initiateSale = async ({ propertyId, buyerWallet, salePrice, onChainSaleId, onChainTxHash }, sellerWallet) => {
    // Validate property
    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found.', 404);
    if (property.status !== 'active') throw new AppError(`Property is ${property.status}. Cannot sell.`, 400);
    if (property.encumbranceStatus) throw new AppError('Property is encumbered. Cannot sell.', 400);
    if (property.ownerWallet.toLowerCase() !== sellerWallet.toLowerCase()) {
        throw new AppError('Only the property owner can initiate a sale.', 403);
    }

    // Validate buyer exists
    const buyer = await User.findByWallet(buyerWallet);
    if (!buyer) throw new AppError('Buyer wallet not registered.', 404);

    // Check no active sale exists
    const activeSale = await SaleTransaction.findActiveByProperty(propertyId);
    if (activeSale) throw new AppError('An active sale already exists for this property.', 409);

    const transaction = await SaleTransaction.create({
        propertyId,
        buyerWallet: buyer.walletAddress, // Ensure case matches users table
        sellerWallet: property.ownerWallet, // Ensure case matches users table
        salePrice
    });

    // The initiator (seller) is considered signed by default
    await SaleTransaction.setSellerSigned(transaction.id);

    let txHash = onChainTxHash || null;

    // ── Blockchain: Register sale on-chain ──────────────────
    if (onChainSaleId) {
        // If frontend already registered it on-chain
        await SaleTransaction.setOnChainId(transaction.id, onChainSaleId);
        if (onChainTxHash) await SaleTransaction.setTxHash(transaction.id, onChainTxHash);
        console.log(`✅ Sale recorded with frontend-provided On-chain ID: ${onChainSaleId}`);
    } else if (property.nftTokenId) {
        // Fallback: Backend tries to register (may fail due to ownership)
        try {
            console.log(`🔗 Initiating on-chain sale for NFT ${property.nftTokenId}...`);
            const result = await contractService.registerOnChainSale(
                property.nftTokenId,
                property.propertyCode,
                property.ownerWallet, // seller
                buyerWallet, // buyer
                ethers.parseUnits(salePrice.toString(), 'ether')
            );

            txHash = result.txHash;
            if (result.saleId) {
                await SaleTransaction.setOnChainId(transaction.id, result.saleId);
                await SaleTransaction.setTxHash(transaction.id, txHash);
                console.log(`✅ On-chain sale registered: ID ${result.saleId}, Tx: ${txHash}`);
            }
        } catch (err) {
            console.error('⚠️ On-chain registration failed:', err.message);
        }
    }

    return { transaction, txHash };
};

/**
 * Sign a sale (buyer or seller).
 */
const signSale = async (saleId, signerWallet, signerRole, signatureHash) => {
    const sale = await SaleTransaction.findById(saleId);
    if (!sale) throw new AppError('Sale transaction not found.', 404);

    // Validate the signer is the correct party
    if (signerRole === 'buyer' && sale.buyerWallet.toLowerCase() !== signerWallet.toLowerCase()) {
        throw new AppError('You are not the buyer in this transaction.', 403);
    }
    if (signerRole === 'seller' && sale.sellerWallet.toLowerCase() !== signerWallet.toLowerCase()) {
        throw new AppError('You are not the seller in this transaction.', 403);
    }

    return withTransaction(async (client) => {
        // Record approval in DB — Use normalized wallet from the sale record
        const normalizedSignerWallet = signerRole === 'buyer' ? sale.buyerWallet : sale.sellerWallet;

        await SaleTransaction.addApproval({
            transactionId: saleId,
            signerWallet: normalizedSignerWallet,
            signerRole,
            signatureHash,
        }, client);

        let txHash = null;
        // set signed flag in DB
        if (signerRole === 'buyer') {
            await SaleTransaction.setBuyerSigned(saleId, client);

            // ── Blockchain: Buyer sign on-chain ──────────────
            if (sale.onChainId) {
                try {
                    const result = await contractService.buyerSignOnChain(sale.onChainId);
                    txHash = result.hash;
                    console.log(`✅ Buyer signed on-chain for SaleID: ${sale.onChainId}, Tx: ${txHash}`);
                } catch (err) {
                    console.error('⚠️ On-chain buyer sign failed:', err.message);
                }
            }
        } else if (signerRole === 'seller') {
            await SaleTransaction.setSellerSigned(saleId, client);
            // On-chain seller sign happened during initiateSale
        }

        // If buyer just signed, transition to BUYER_SIGNED
        if (signerRole === 'buyer' && sale.status === SALE_STATUS.INITIATED) {
            validateTransition(sale.status, SALE_STATUS.BUYER_SIGNED);
            await SaleTransaction.updateStatus(saleId, SALE_STATUS.BUYER_SIGNED, client);
        }

        const updatedSale = await SaleTransaction.findById(saleId, client);
        return { sale: updatedSale, txHash };
    });
};

/**
 * Authority approves a sale.
 */
const approveSale = async (saleId, authorityWallet, signatureHash) => {
    const sale = await SaleTransaction.findById(saleId);
    if (!sale) throw new AppError('Sale transaction not found.', 404);

    if (!sale.fundsBlocked) {
        throw new AppError('Funds must be blocked before authority approval.', 400);
    }

    validateTransition(sale.status, SALE_STATUS.AUTHORITY_APPROVED);

    return withTransaction(async (client) => {
        await SaleTransaction.addApproval({
            transactionId: saleId,
            signerWallet: authorityWallet,
            signerRole: 'authority',
            signatureHash,
        }, client);

        await SaleTransaction.setAuthoritySigned(saleId, client);
        return SaleTransaction.updateStatus(saleId, SALE_STATUS.AUTHORITY_APPROVED, client);
    });
};

/**
 * Complete a sale — transfer ownership.
 */
const completeSale = async (saleId) => {
    const sale = await SaleTransaction.findById(saleId);
    if (!sale) throw new AppError('Sale transaction not found.', 404);

    if (!canComplete(sale)) {
        throw new AppError('Cannot complete sale. Missing signatures or funds block.', 400);
    }

    // 1. Blockchain: Execute Final Transfer (Outside DB transaction)
    let txHash = null;
    if (sale.onChainId) {
        try {
            console.log(`🔗 Executing on-chain execution for SaleID ${sale.onChainId}...`);
            const result = await contractService.completeOnChainSale(sale.onChainId);
            txHash = result.txHash;
            console.log(`✅ On-chain sale completed. Tx: ${txHash}`);
        } catch (err) {
            // Check if it's already completed on-chain (out-of-sync recovery)
            if (err.message.includes('Not approved by authority')) {
                console.log('ℹ️ Sale already completed on-chain. Syncing DB status...');
            } else {
                console.error('❌ On-chain sale completion failed:', err.message);
                throw err;
            }
        }
    }

    // 2. Database Updates (Atomic)
    validateTransition(sale.status, SALE_STATUS.COMPLETED);

    return withTransaction(async (client) => {
        // Transfer property ownership in DB
        await Property.updateOwner(sale.propertyId, sale.buyerWallet, client);

        // Mark sale completed in DB
        const updatedSale = await SaleTransaction.updateStatus(saleId, SALE_STATUS.COMPLETED, client);
        return { sale: updatedSale, txHash };
    });
};

/**
 * Cancel a sale.
 */
const cancelSale = async (saleId, cancellerWallet) => {
    const sale = await SaleTransaction.findById(saleId);
    if (!sale) throw new AppError('Sale transaction not found.', 404);

    // Only buyer, seller, or authority can cancel
    const isParty =
        sale.buyerWallet.toLowerCase() === cancellerWallet.toLowerCase() ||
        sale.sellerWallet.toLowerCase() === cancellerWallet.toLowerCase();

    if (!isParty) {
        throw new AppError('Only buyer or seller can cancel.', 403);
    }

    validateTransition(sale.status, SALE_STATUS.CANCELLED);
    return SaleTransaction.updateStatus(saleId, SALE_STATUS.CANCELLED);
};

/**
 * Freeze a sale (court action).
 */
const freezeSale = async (saleId) => {
    const sale = await SaleTransaction.findById(saleId);
    if (!sale) throw new AppError('Sale transaction not found.', 404);
    validateTransition(sale.status, SALE_STATUS.FROZEN);
    return SaleTransaction.updateStatus(saleId, SALE_STATUS.FROZEN);
};

/**
 * Get sale details with approvals.
 */
const getSaleDetails = async (saleId) => {
    const sale = await SaleTransaction.findById(saleId);
    if (!sale) throw new AppError('Sale transaction not found.', 404);
    const approvals = await SaleTransaction.getApprovals(saleId);
    const fundBlocks = await FundBlock.findByTransaction(saleId);
    return { ...sale, approvals, fundBlocks };
};

module.exports = {
    initiateSale,
    signSale,
    approveSale,
    completeSale,
    cancelSale,
    freezeSale,
    getSaleDetails,
    validateTransition,
    canComplete,
};
