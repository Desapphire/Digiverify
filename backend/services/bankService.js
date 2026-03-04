/**
 * Bank Service — ASBA-style fund blocking logic.
 */

const FundBlock = require('../models/FundBlock');
const SaleTransaction = require('../models/SaleTransaction');
const { withTransaction } = require('../config/db');
const { SALE_STATUS } = require('../config/constants');
const saleService = require('./saleService');
const contractService = require('../blockchain/contractService');
const AppError = require('../utils/AppError');

/**
 * Request a fund block for a sale transaction.
 */
const requestFundBlock = async ({ transactionId, blockAmount, currency }, buyerWallet) => {
    const sale = await SaleTransaction.findById(transactionId);
    if (!sale) throw new AppError('Sale transaction not found.', 404);

    if (sale.buyerWallet.toLowerCase() !== buyerWallet.toLowerCase()) {
        throw new AppError('Only the buyer can request a fund block.', 403);
    }

    if (sale.fundsBlocked) {
        throw new AppError('Funds are already blocked for this transaction.', 400);
    }

    if (parseFloat(blockAmount) < sale.salePrice) {
        throw new AppError(`Block amount (${blockAmount}) must be at least the sale price (${sale.salePrice}).`, 400);
    }

    return FundBlock.create({ transactionId, buyerWallet, blockAmount, currency });
};

/**
 * Bank admin confirms a fund block.
 */
const confirmFundBlock = async (fundBlockId, bankReferenceId, bankUserId) => {
    const fundBlock = await FundBlock.findById(fundBlockId);
    if (!fundBlock) throw new AppError('Fund block not found.', 404);

    if (fundBlock.bankConfirmed) {
        throw new AppError('Fund block already confirmed.', 400);
    }

    return withTransaction(async (client) => {
        const confirmed = await FundBlock.confirmBlock(fundBlockId, bankReferenceId, bankUserId, client);

        // Update sale transaction: set fundsBlocked flag and transition status
        const sale = await SaleTransaction.findById(fundBlock.transactionId);
        await SaleTransaction.setFundsBlocked(fundBlock.transactionId, client);

        // ── Blockchain: Confirm funds blocked on-chain (BANK_ROLE) ──
        if (sale.onChainId) {
            try {
                await contractService.confirmFundsBlockedOnChain(sale.onChainId);
                console.log(`✅ Funds confirmed on-chain for SaleID: ${sale.onChainId}`);
            } catch (err) {
                console.error('⚠️ On-chain fund confirmation failed:', err.message);
            }
        }

        if (sale.status === SALE_STATUS.BUYER_SIGNED) {
            saleService.validateTransition(sale.status, SALE_STATUS.FUNDS_BLOCKED);
            await SaleTransaction.updateStatus(fundBlock.transactionId, SALE_STATUS.FUNDS_BLOCKED, client);
        }

        return { confirmed, txHash };
    });
};

/**
 * Release blocked funds (after cancellation or completion).
 */
const releaseFunds = async (fundBlockId) => {
    const fundBlock = await FundBlock.findById(fundBlockId);
    if (!fundBlock) throw new AppError('Fund block not found.', 404);

    if (fundBlock.status !== 'blocked') {
        throw new AppError(`Cannot release funds in "${fundBlock.status}" state.`, 400);
    }

    return FundBlock.release(fundBlockId);
};

/**
 * Get fund blocks for a transaction.
 */
const getFundBlocks = async (transactionId) => {
    return FundBlock.findByTransaction(transactionId);
};

module.exports = { requestFundBlock, confirmFundBlock, releaseFunds, getFundBlocks };
