/**
 * Bank Controller — ASBA-style fund blocking.
 */

const bankService = require('../services/bankService');
const auditService = require('../services/auditService');
const { AUDIT_ACTIONS } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');

/**
 * POST /api/bank/fund-block
 */
const requestFundBlock = catchAsync(async (req, res) => {
    const fundBlock = await bankService.requestFundBlock(req.body, req.user.walletAddress);

    await auditService.log({
        actionType: AUDIT_ACTIONS.FUND_BLOCK_REQUESTED,
        req,
        entityId: fundBlock.id,
        entityType: 'fund_block',
        metadata: { transactionId: req.body.transactionId, amount: req.body.blockAmount },
    });

    return res.status(201).json({
        success: true,
        message: 'Fund block requested.',
        data: fundBlock,
    });
});

/**
 * PUT /api/bank/fund-block/:id/confirm
 */
const confirmFundBlock = catchAsync(async (req, res) => {
    const { confirmed, txHash } = await bankService.confirmFundBlock(
        req.params.id,
        req.body.bankReferenceId,
        req.user.id
    );

    await auditService.log({
        actionType: AUDIT_ACTIONS.FUND_BLOCK_CONFIRMED,
        req,
        entityId: confirmed.id,
        entityType: 'fund_block',
        metadata: { bankReferenceId: req.body.bankReferenceId },
    });

    return res.status(200).json({
        success: true,
        message: 'Fund block confirmed.',
        data: confirmed,
        blockchainTxHash: txHash
    });
});

/**
 * PUT /api/bank/fund-block/:id/release
 */
const releaseFunds = catchAsync(async (req, res) => {
    const fundBlock = await bankService.releaseFunds(req.params.id);

    await auditService.log({
        actionType: AUDIT_ACTIONS.FUND_UNBLOCKED,
        req,
        entityId: fundBlock.id,
        entityType: 'fund_block',
    });

    return res.status(200).json({
        success: true,
        message: 'Funds released.',
        data: fundBlock,
    });
});

/**
 * GET /api/bank/fund-block/transaction/:transactionId
 */
const getFundBlocks = catchAsync(async (req, res) => {
    const blocks = await bankService.getFundBlocks(req.params.transactionId);

    return res.status(200).json({
        success: true,
        data: blocks,
    });
});

module.exports = { requestFundBlock, confirmFundBlock, releaseFunds, getFundBlocks };
