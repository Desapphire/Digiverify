/**
 * Court Controller — Judicial freeze, reversal, and force-transfer.
 */

const courtService = require('../services/courtService');
const auditService = require('../services/auditService');
const { AUDIT_ACTIONS } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');
const tempStorage = require('../utils/tempStorage');

/**
 * POST /api/court/freeze
 */
const freezeProperty = catchAsync(async (req, res) => {
    const uploadedList = [];
    try {
        await tempStorage.resolveAllHashes(req.body, uploadedList);
        const freezeOrder = await courtService.freezeProperty(req.body, req.user.id);

        await auditService.log({
            actionType: AUDIT_ACTIONS.COURT_FREEZE_ISSUED,
            req,
            entityId: req.body.propertyId,
            entityType: 'property',
            metadata: { caseNumber: req.body.caseNumber },
        });

        return res.status(201).json({
            success: true,
            message: 'Property frozen by court order.',
            data: freezeOrder,
        });
    } catch (err) {
        for (const hash of uploadedList) {
            await tempStorage.unpinFromPinata(hash);
        }
        throw err;
    }
});

/**
 * POST /api/court/reverse/:freezeOrderId
 */
const reverseFreezeOrder = catchAsync(async (req, res) => {
    const uploadedList = [];
    try {
        await tempStorage.resolveAllHashes(req.body, uploadedList);
        await tempStorage.resolveAllHashes(req.params, uploadedList);
        
        const reversal = await courtService.reverseFreezeOrder(
            req.params.freezeOrderId,
            req.body,
            req.user.id
        );

        await auditService.log({
            actionType: AUDIT_ACTIONS.COURT_REVERSAL_ISSUED,
            req,
            entityId: reversal.property_id,
            entityType: 'property',
            metadata: { freezeOrderId: req.params.freezeOrderId },
        });

        return res.status(200).json({
            success: true,
            message: 'Freeze order reversed.',
            data: reversal,
        });
    } catch (err) {
        for (const hash of uploadedList) {
            await tempStorage.unpinFromPinata(hash);
        }
        throw err;
    }
});

/**
 * POST /api/court/force-transfer
 */
const forceTransfer = catchAsync(async (req, res) => {
    const uploadedList = [];
    try {
        await tempStorage.resolveAllHashes(req.body, uploadedList);
        const property = await courtService.forceTransfer(req.body, req.user.id);

        await auditService.log({
            actionType: AUDIT_ACTIONS.COURT_FORCE_TRANSFER,
            req,
            entityId: req.body.propertyId,
            entityType: 'property',
            metadata: { newOwnerWallet: req.body.newOwnerWallet },
        });

        return res.status(200).json({
            success: true,
            message: 'Ownership force-transferred by court order.',
            data: property,
        });
    } catch (err) {
        for (const hash of uploadedList) {
            await tempStorage.unpinFromPinata(hash);
        }
        throw err;
    }
});

module.exports = { freezeProperty, reverseFreezeOrder, forceTransfer };
