/**
 * Property Controller — Property registration and management.
 */

const propertyService = require('../services/propertyService');
const auditService = require('../services/auditService');
const { pool } = require('../config/db');
const { AUDIT_ACTIONS } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');

const tempStorage = require('../utils/tempStorage');

/**
 * POST /api/properties
 */
const registerProperty = catchAsync(async (req, res) => {
    const uploadedList = [];
    try {
        // Resolve any temporary local cache hashes in the payload to real Pinata IPFS hashes
        await tempStorage.resolveAllHashes(req.body, uploadedList);

        const { property, txHash } = await propertyService.registerProperty(req.body, req.user.walletAddress, req.user.id);

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
    } catch (err) {
        // Rollback: unpin files from Pinata if the registration failed
        for (const hash of uploadedList) {
            await tempStorage.unpinFromPinata(hash);
        }
        throw err;
    }
});

/**
 * POST /api/properties/:id/reapply
 */
const reapplyProperty = catchAsync(async (req, res) => {
    const uploadedList = [];
    try {
        // Resolve any temporary local cache hashes in the payload to real Pinata IPFS hashes
        await tempStorage.resolveAllHashes(req.body, uploadedList);

        const property = await propertyService.reapplyProperty(
            req.params.id,
            req.body,
            req.user.walletAddress,
            req.user.id
        );

        await auditService.log({
            actionType: AUDIT_ACTIONS.PROPERTY_REGISTERED,
            req,
            entityId: property.id,
            entityType: 'property',
            metadata: { reapply: true, propertyCode: property.propertyCode }
        });

        return res.status(200).json({
            success: true,
            message: 'Property application successfully resubmitted for authority review.',
            data: property
        });
    } catch (err) {
        // Rollback: unpin files from Pinata if the registration failed
        for (const hash of uploadedList) {
            await tempStorage.unpinFromPinata(hash);
        }
        throw err;
    }
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

/**
 * GET /api/properties/:id/freeze-orders
 * Returns active court freeze orders for a property (public to owner and admins).
 */
const getPropertyFreezeOrders = catchAsync(async (req, res) => {
    const result = await pool.query(
        `SELECT cfo.id, cfo.court_order_hash, cfo.case_number, cfo.reason,
                cfo.is_active, cfo.frozen_at AS created_at,
                u.name AS court_officer_name, u.email AS court_officer_email
         FROM court_freeze_orders cfo
         LEFT JOIN users u ON u.id = cfo.court_user_id
         WHERE cfo.property_id = $1
         ORDER BY cfo.frozen_at DESC`,
        [req.params.id]
    );
    return res.status(200).json({ success: true, data: result.rows });
});

/**
 * GET /api/properties/:id/metadata
 * Standard ERC-721 Metadata JSON for NFT Explorers / Wallets (Etherscan, OpenSea, MetaMask).
 */
const getPropertyMetadata = catchAsync(async (req, res) => {
    const property = await propertyService.getProperty(req.params.id);
    if (!property) {
        return res.status(404).json({ error: 'Property not found' });
    }

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'http';
    const imageUri = `${protocol}://${host}/api/properties/${property.id}/certificate.svg`;

    const metadata = {
        name: `DigiVerify Land Title — ${property.propertyCode}`,
        description: `Official Sovereign Land Title Deed & Ownership Certificate for Property ${property.propertyCode}, Survey #${property.surveyNumber || 'N/A'} located in ${property.district || ''}, ${property.state || ''}. Digitally authenticated by Revenue Authority and anchored on Ethereum Sepolia Testnet.`,
        image: imageUri,
        external_url: `https://sepolia.etherscan.io/token/0xbCB28DC4eF6242572c0a65D1643595C582106249`,
        attributes: [
            { trait_type: 'Property Code', value: property.propertyCode },
            { trait_type: 'Survey Number', value: property.surveyNumber || 'N/A' },
            { trait_type: 'Survey Details', value: property.surveyDetails || 'Revenue Subdivision' },
            { trait_type: 'Area (Sq. Ft)', value: parseFloat(property.areaSqft) || 0 },
            { trait_type: 'District', value: property.district || 'N/A' },
            { trait_type: 'State', value: property.state || 'N/A' },
            { trait_type: 'Coordinates', value: (property.geoLat && property.geoLng ? `${property.geoLat}, ${property.geoLng}` : property.coordinates) || 'N/A' },
            { trait_type: 'First Owner', value: property.ownerWallet || property.ownerAddress || 'N/A' },
            { trait_type: 'Title Status', value: 'Government Verified & Clear Title' },
            { trait_type: 'Encumbrance Status', value: property.isEncumbered ? 'Encumbered' : 'Clear Title' },
            { trait_type: 'Valuation (INR)', value: property.estimatedFairPrice ? `₹${Number(property.estimatedFairPrice).toLocaleString('en-IN')}` : 'N/A' },
            { trait_type: 'Issuing Authority', value: 'Revenue Department Land Administration' },
            { trait_type: 'Blockchain Network', value: 'Ethereum Sepolia Testnet (11155111)' }
        ]
    };

    return res.status(200).json(metadata);
});

/**
 * GET /api/properties/:id/certificate.svg
 * Returns dynamic SVG Title Certificate for the property.
 */
const getPropertyCertificateSvg = catchAsync(async (req, res) => {
    const property = await propertyService.getProperty(req.params.id);
    if (!property) {
        return res.status(404).send('Property not found');
    }

    const { generateCertificateSVG } = require('../services/nftMetadataService');
    const svg = generateCertificateSVG(property);

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(svg);
});

module.exports = {
    registerProperty,
    reapplyProperty,
    getProperty,
    getMyProperties,
    searchProperties,
    uploadDocument,
    getDocuments,
    getPropertyFreezeOrders,
    getPropertyMetadata,
    getPropertyCertificateSvg
};

