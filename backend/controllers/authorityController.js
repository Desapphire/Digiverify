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
    const property = await authorityService.approveProperty(req.params.id);

    await auditService.log({
        actionType: AUDIT_ACTIONS.PROPERTY_APPROVED,
        req,
        entityId: req.params.id,
        entityType: 'property',
    });

    return res.status(200).json({
        success: true,
        message: 'Property approved.',
        data: property,
    });
});

/**
 * POST /api/authority/sale/:id/approve
 */
const approveSale = catchAsync(async (req, res) => {
    const sale = await authorityService.approveSaleTransaction(
        req.params.id,
        req.user.walletAddress,
        req.body.signatureHash
    );

    await auditService.log({
        actionType: AUDIT_ACTIONS.SALE_AUTHORITY_APPROVED,
        req,
        entityId: req.params.id,
        entityType: 'sale_transaction',
    });

    return res.status(200).json({
        success: true,
        message: 'Sale approved by authority.',
        data: sale,
    });
});

/**
 * POST /api/authority/sale/:id/reject
 */
const rejectSale = catchAsync(async (req, res) => {
    const sale = await authorityService.rejectSaleTransaction(req.params.id);

    await auditService.log({
        actionType: AUDIT_ACTIONS.SALE_CANCELLED,
        req,
        entityId: req.params.id,
        entityType: 'sale_transaction',
        metadata: { rejectedByAuthority: true },
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
    const flag = req.body.encumbrance === true;
    const property = await authorityService.setEncumbrance(req.params.id, flag);
    const actionType = flag ? AUDIT_ACTIONS.ENCUMBRANCE_SET : AUDIT_ACTIONS.ENCUMBRANCE_CLEARED;

    await auditService.log({
        actionType,
        req,
        entityId: req.params.id,
        entityType: 'property',
    });

    return res.status(200).json({
        success: true,
        message: flag ? 'Encumbrance set.' : 'Encumbrance cleared.',
        data: property,
    });
});

module.exports = { approveProperty, approveSale, rejectSale, setEncumbrance };
