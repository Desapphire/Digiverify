/**
 * Property Controller — Property registration and management.
 */

const propertyService = require('../services/propertyService');
const auditService = require('../services/auditService');
const { AUDIT_ACTIONS } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');

/**
 * POST /api/properties
 */
const registerProperty = catchAsync(async (req, res) => {
    const { property, txHash } = await propertyService.registerProperty(req.body, req.user.walletAddress);

    await auditService.log({
        actionType: AUDIT_ACTIONS.PROPERTY_REGISTERED,
        req,
        entityId: property.id,
        entityType: 'property',
    });

    return res.status(201).json({
        success: true,
        message: 'Property registered and queued for approval.',
        data: property,
        blockchainTxHash: txHash
    });
});

/**
 * GET /api/properties/:id
 */
const getProperty = catchAsync(async (req, res) => {
    const property = await propertyService.getProperty(req.params.id);

    return res.status(200).json({
        success: true,
        data: property,
    });
});

/**
 * GET /api/properties/my
 */
const getMyProperties = catchAsync(async (req, res) => {
    const properties = await propertyService.getPropertiesByOwner(req.user.walletAddress);

    return res.status(200).json({
        success: true,
        data: properties,
    });
});

/**
 * GET /api/properties/search
 */
const searchProperties = catchAsync(async (req, res) => {
    const { district, state, status, limit, offset } = req.query;
    const properties = await propertyService.searchProperties({
        district, state, status,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
    });

    return res.status(200).json({
        success: true,
        data: properties,
    });
});

/**
 * POST /api/properties/:id/documents
 */
const uploadDocument = catchAsync(async (req, res) => {
    const doc = await propertyService.uploadPropertyDocument(
        req.params.id,
        req.body,
        req.user.id
    );

    await auditService.log({
        actionType: AUDIT_ACTIONS.PROPERTY_DOCUMENT_UPLOADED,
        req,
        entityId: req.params.id,
        entityType: 'property',
        metadata: { documentType: req.body.documentType, ipfsHash: req.body.ipfsHash },
    });

    return res.status(201).json({
        success: true,
        message: 'Document uploaded.',
        data: doc,
    });
});

/**
 * GET /api/properties/:id/documents
 */
const getDocuments = catchAsync(async (req, res) => {
    const docs = await propertyService.getPropertyDocuments(req.params.id);

    return res.status(200).json({
        success: true,
        data: docs,
    });
});

module.exports = { registerProperty, getProperty, getMyProperties, searchProperties, uploadDocument, getDocuments };
