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

module.exports = router;
