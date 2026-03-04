/**
 * Admin & Authority Routes
 * Consolidated endpoints for administrative actions performed by Government Authorities, Courts, and Bank Admins.
 */
const express = require('express');
const router = express.Router();

const {
    approveProperty,
    approveSale,
    rejectSale,
    setEncumbrance
} = require('../controllers/authorityController');

const {
    freezeProperty,
    reverseFreezeOrder,
    forceTransfer
} = require('../controllers/courtController');

const {
    getPendingRecoveries,
    verifyIdentity,
    completeRecovery,
    rejectRecovery,
} = require('../controllers/walletRecoveryController');

const {
    approveKyc,
    rejectKyc,
    listUsers
} = require('../controllers/userController');

const {
    completeSale
} = require('../controllers/saleController');

const {
    confirmFundBlock,
    releaseFunds
} = require('../controllers/bankController');

const { getAuditLogs } = require('../controllers/auditController');

// Direct model imports for admin list endpoints
const Property = require('../models/Property');
const SaleTransaction = require('../models/SaleTransaction');
const FundBlock = require('../models/FundBlock');
const catchAsync = require('../utils/catchAsync');

const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const {
    freezePropertySchema,
    forceTransferSchema,
    completeRecoverySchema,
    confirmFundBlockSchema
} = require('../utils/validators');
const { ROLES } = require('../config/constants');

// Apply authentication and check for administrative roles for all routes in this file
router.use(authenticate);
router.use(authorize(ROLES.AUTHORITY, ROLES.COURT, ROLES.BANK_ADMIN, ROLES.SUPER_ADMIN));

// --- Property & Sale Management (Authority) ---
router.put('/property/:id/approve', approveProperty);
router.post('/sale/:id/approve', approveSale);
router.post('/sale/:id/reject', rejectSale);
router.post('/sale/:id/complete', completeSale);
router.put('/property/:id/encumbrance', setEncumbrance);

// --- Property Legal Actions (Court) ---
router.post('/property/freeze', validate(freezePropertySchema), freezeProperty);
router.post('/property/reverse-freeze/:freezeOrderId', reverseFreezeOrder);
router.post('/property/force-transfer', validate(forceTransferSchema), forceTransfer);

// --- User KYC Management ---
router.get('/users', listUsers);
router.put('/kyc/:id/approve', approveKyc);
router.put('/kyc/:id/reject', rejectKyc);

// --- Wallet Recovery Management ---
router.get('/recovery/pending', getPendingRecoveries);
router.put('/recovery/:id/verify', verifyIdentity);
router.put('/recovery/:id/complete', validate(completeRecoverySchema), completeRecovery);
router.put('/recovery/:id/reject', rejectRecovery);

// --- Bank Fund Management (Bank Admin) ---
router.put('/bank/fund-block/:id/confirm', validate(confirmFundBlockSchema), confirmFundBlock);
router.put('/bank/fund-block/:id/release', releaseFunds);

// --- Audit Logs ---
router.get('/audit', getAuditLogs);

// --- Admin List Endpoints (Dashboard) ---
router.get('/properties', catchAsync(async (req, res) => {
    const { status, limit = 50, offset = 0 } = req.query;
    const properties = await Property.search({ status, limit: parseInt(limit), offset: parseInt(offset) });
    return res.json({ success: true, data: properties });
}));

router.get('/sales', catchAsync(async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;
    const sales = await SaleTransaction.findAll(parseInt(limit), parseInt(offset));
    return res.json({ success: true, data: sales });
}));

router.get('/fund-blocks/pending', catchAsync(async (req, res) => {
    const { pool: dbPool } = require('../config/db');
    const result = await dbPool.query(
        "SELECT * FROM fund_blocks WHERE status = 'pending' OR bank_confirmed = FALSE ORDER BY blocked_at DESC"
    );
    return res.json({ success: true, data: result.rows });
}));

// --- Wallet Explorer (Deep Lookup by wallet, email, or userId) ---
router.get('/wallet/:query', catchAsync(async (req, res) => {
    const { pool: dbPool } = require('../config/db');
    const q = req.params.query.trim();

    // Detect input type and find user
    let userResult;
    const isWallet = q.startsWith('0x');
    const isEmail = q.includes('@');
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(q);

    if (isWallet) {
        userResult = await dbPool.query(
            'SELECT id, name, email, wallet_address, role, kyc_status, kyc_document_hash, face_id_hash, created_at FROM users WHERE LOWER(wallet_address) = LOWER($1) LIMIT 1', [q]
        );
    } else if (isEmail) {
        userResult = await dbPool.query(
            'SELECT id, name, email, wallet_address, role, kyc_status, kyc_document_hash, face_id_hash, created_at FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [q]
        );
    } else if (isUUID) {
        userResult = await dbPool.query(
            'SELECT id, name, email, wallet_address, role, kyc_status, kyc_document_hash, face_id_hash, created_at FROM users WHERE id = $1 LIMIT 1', [q]
        );
    } else {
        // Try name search
        userResult = await dbPool.query(
            'SELECT id, name, email, wallet_address, role, kyc_status, kyc_document_hash, face_id_hash, created_at FROM users WHERE LOWER(name) LIKE LOWER($1) LIMIT 5', [`%${q}%`]
        );
    }

    const userRow = userResult.rows[0];
    const walletAddress = userRow?.wallet_address;

    // Find properties owned by this wallet
    let ownedProps = [];
    if (walletAddress) {
        const propResult = await dbPool.query(
            'SELECT * FROM properties WHERE LOWER(owner_wallet) = LOWER($1) ORDER BY created_at DESC', [walletAddress]
        );
        ownedProps = propResult.rows.map(r => ({
            id: r.id, propertyCode: r.property_code, surveyNumber: r.survey_number,
            district: r.district, state: r.state, areaSqft: r.area_sqft ? parseFloat(r.area_sqft) : null,
            ownerWallet: r.owner_wallet, status: r.status, encumbranceStatus: r.encumbrance_status,
            nftTokenId: r.nft_token_id, createdAt: r.created_at,
        }));
    }

    // Find sale transactions
    let sales = [];
    if (walletAddress) {
        sales = await SaleTransaction.findByWallet(walletAddress);
    }

    // Find audit logs
    let auditLogs = [];
    if (walletAddress) {
        const auditResult = await dbPool.query(
            'SELECT * FROM audit_logs WHERE actor_wallet = $1 ORDER BY created_at DESC LIMIT 20', [walletAddress]
        );
        auditLogs = auditResult.rows;
    } else if (userRow) {
        const auditResult = await dbPool.query(
            'SELECT * FROM audit_logs WHERE actor_user_id = $1 ORDER BY created_at DESC LIMIT 20', [userRow.id]
        );
        auditLogs = auditResult.rows;
    }

    const user = userRow ? {
        id: userRow.id, name: userRow.name, email: userRow.email,
        walletAddress: userRow.wallet_address, role: userRow.role,
        kycStatus: userRow.kyc_status, kycDocumentHash: userRow.kyc_document_hash,
        faceIdHash: userRow.face_id_hash, createdAt: userRow.created_at,
    } : null;

    return res.json({
        success: true,
        data: { user, properties: ownedProps, sales, auditLogs }
    });
}));

module.exports = router;
