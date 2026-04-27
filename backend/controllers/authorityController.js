/**
 * Authority Controller — Government authority actions.
 */

const authorityService = require('../services/authorityService');
const auditService = require('../services/auditService');
const { AUDIT_ACTIONS } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');

/**
 * PUT /api/authority/property/:id/approve
 */
const approveProperty = catchAsync(async (req, res) => {
    const reason = req.body?.reason?.trim() || null;
    const { property, txHash } = await authorityService.approveProperty(req.params.id, reason);

    await auditService.log({
        actionType: AUDIT_ACTIONS.PROPERTY_APPROVED,
        req,
        entityId: req.params.id,
        entityType: 'property',
        metadata: { reason },
    });

    return res.status(200).json({
        success: true,
        message: 'Property approved.',
        data: property,
        blockchainTxHash: txHash
    });
});

/**
 * PUT /api/authority/property/:id/reject
 */
const rejectProperty = catchAsync(async (req, res) => {
    const reason = req.body?.reason?.trim() || null;
    const property = await authorityService.rejectProperty(req.params.id, reason);

    await auditService.log({
        actionType: AUDIT_ACTIONS.PROPERTY_REJECTED,
        req,
        entityId: req.params.id,
        entityType: 'property',
        metadata: { reason },
    });

    return res.status(200).json({
        success: true,
        message: 'Property rejected.',
        data: property,
    });
});

/**
 * POST /api/authority/sale/:id/approve
 */
const approveSale = catchAsync(async (req, res) => {
    // Ensure req.body is defined to avoid crashes
    const signatureHash = (req.body && req.body.signatureHash) || null;
    const reason = req.body?.reason?.trim() || null;

    const { sale, txHash } = await authorityService.approveSaleTransaction(
        req.params.id,
        req.user.walletAddress,
        signatureHash,
        reason
    );

    await auditService.log({
        actionType: AUDIT_ACTIONS.SALE_AUTHORITY_APPROVED,
        req,
        entityId: req.params.id,
        entityType: 'sale_transaction',
        metadata: { reason },
    });

    return res.status(200).json({
        success: true,
        message: 'Sale approved by authority.',
        data: sale,
        blockchainTxHash: txHash
    });
});

/**
 * POST /api/authority/sale/:id/reject
 */
const rejectSale = catchAsync(async (req, res) => {
    const reason = req.body?.reason?.trim() || null;
    const sale = await authorityService.rejectSaleTransaction(req.params.id, reason);

    await auditService.log({
        actionType: AUDIT_ACTIONS.SALE_CANCELLED,
        req,
        entityId: req.params.id,
        entityType: 'sale_transaction',
        metadata: { rejectedByAuthority: true, reason },
    });

    return res.status(200).json({
        success: true,
        message: 'Sale rejected by authority.',
        data: sale,
    });
});

/**
 * PUT /api/authority/property/:id/encumbrance
 */
const setEncumbrance = catchAsync(async (req, res) => {
    const flag = req.body?.encumbrance === true;
    const reason = req.body?.reason?.trim() || null;
    const property = await authorityService.setEncumbrance(req.params.id, flag, reason);
    const actionType = flag ? AUDIT_ACTIONS.ENCUMBRANCE_SET : AUDIT_ACTIONS.ENCUMBRANCE_CLEARED;

    await auditService.log({
        actionType,
        req,
        entityId: req.params.id,
        entityType: 'property',
        metadata: flag && reason ? { reason } : undefined,
    });

    return res.status(200).json({
        success: true,
        message: flag ? 'Encumbrance set.' : 'Encumbrance cleared.',
        data: property,
    });
});

module.exports = { approveProperty, rejectProperty, approveSale, rejectSale, setEncumbrance };
