/**
 * Wallet Recovery Controller — Lost wallet recovery workflow.
 */

const walletRecoveryService = require('../services/walletRecoveryService');
const auditService = require('../services/auditService');
const { AUDIT_ACTIONS } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');

/**
 * POST /api/recovery/request
 */
const requestRecovery = catchAsync(async (req, res) => {
    const recovery = await walletRecoveryService.requestRecovery(
        req.user.id,
        req.body.oldWallet,
        req.body.reason
    );

    await auditService.log({
        actionType: AUDIT_ACTIONS.WALLET_RECOVERY_REQUESTED,
        req,
        entityId: recovery.id,
        entityType: 'wallet_recovery',
        metadata: { oldWallet: req.body.oldWallet },
    });

    return res.status(201).json({
        success: true,
        message: 'Recovery request submitted.',
        data: recovery,
    });
});

/**
 * PUT /api/recovery/:id/verify
 */
const verifyIdentity = catchAsync(async (req, res) => {
    const recovery = await walletRecoveryService.verifyIdentity(req.params.id, req.user.id);

    await auditService.log({
        actionType: AUDIT_ACTIONS.WALLET_RECOVERY_VERIFIED,
        req,
        entityId: req.params.id,
        entityType: 'wallet_recovery',
    });

    return res.status(200).json({
        success: true,
        message: 'Identity verified.',
        data: recovery,
    });
});

/**
 * PUT /api/recovery/:id/complete
 */
const completeRecovery = catchAsync(async (req, res) => {
    const recovery = await walletRecoveryService.completeRecovery(
        req.params.id,
        req.body.newWallet
    );

    await auditService.log({
        actionType: AUDIT_ACTIONS.WALLET_RECOVERY_COMPLETED,
        req,
        entityId: req.params.id,
        entityType: 'wallet_recovery',
        metadata: { newWallet: req.body.newWallet },
    });

    return res.status(200).json({
        success: true,
        message: 'Wallet recovery completed. Ownership transferred.',
        data: recovery,
    });
});

/**
 * PUT /api/recovery/:id/reject
 */
const rejectRecovery = catchAsync(async (req, res) => {
    const recovery = await walletRecoveryService.rejectRecovery(req.params.id, req.user.id);

    await auditService.log({
        actionType: AUDIT_ACTIONS.WALLET_RECOVERY_REJECTED,
        req,
        entityId: req.params.id,
        entityType: 'wallet_recovery',
    });

    return res.status(200).json({
        success: true,
        message: 'Recovery request rejected.',
        data: recovery,
    });
});

/**
 * GET /api/recovery/pending
 */
const getPendingRecoveries = catchAsync(async (req, res) => {
    const recoveries = await walletRecoveryService.getPendingRecoveries();

    return res.status(200).json({
        success: true,
        data: recoveries,
    });
});

module.exports = { requestRecovery, verifyIdentity, completeRecovery, rejectRecovery, getPendingRecoveries };
