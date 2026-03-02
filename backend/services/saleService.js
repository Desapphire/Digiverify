/**
 * Sale Service — State machine logic for multi-sign sale workflow.
 */

const SaleTransaction = require('../models/SaleTransaction');
const Property = require('../models/Property');
const User = require('../models/User');
const { withTransaction } = require('../config/db');
const { SALE_STATUS, SALE_STATE_TRANSITIONS, SALE_COMPLETION_REQUIREMENTS } = require('../config/constants');
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
const initiateSale = async ({ propertyId, buyerWallet, salePrice }, sellerWallet) => {
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

    return SaleTransaction.create({ propertyId, buyerWallet, sellerWallet, salePrice });
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
        // Record approval
        await SaleTransaction.addApproval({
            transactionId: saleId,
            signerWallet,
            signerRole,
            signatureHash,
        }, client);

        // Set signed flag
        if (signerRole === 'buyer') {
            await SaleTransaction.setBuyerSigned(saleId, client);
        } else if (signerRole === 'seller') {
            await SaleTransaction.setSellerSigned(saleId, client);
        }

        // If buyer just signed, transition to BUYER_SIGNED
        if (signerRole === 'buyer' && sale.status === SALE_STATUS.INITIATED) {
            validateTransition(sale.status, SALE_STATUS.BUYER_SIGNED);
            return SaleTransaction.updateStatus(saleId, SALE_STATUS.BUYER_SIGNED, client);
        }

        return SaleTransaction.findById(saleId);
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
        throw new AppError(
            'Cannot complete sale. Missing pre-conditions: ' +
            `buyerSigned=${sale.buyerSigned}, sellerSigned=${sale.sellerSigned}, ` +
            `authoritySigned=${sale.authoritySigned}, fundsBlocked=${sale.fundsBlocked}`,
            400
        );
    }

    validateTransition(sale.status, SALE_STATUS.COMPLETED);

    return withTransaction(async (client) => {
        // Transfer property ownership
        await Property.updateOwner(sale.propertyId, sale.buyerWallet, client);

        // Mark sale completed
        return SaleTransaction.updateStatus(saleId, SALE_STATUS.COMPLETED, client);
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
    return { ...sale, approvals };
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
