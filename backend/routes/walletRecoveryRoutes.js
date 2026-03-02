/**
 * Wallet Recovery Routes
 */
const express = require('express');
const router = express.Router();
const {
    requestRecovery, verifyIdentity, completeRecovery, rejectRecovery, getPendingRecoveries,
} = require('../controllers/walletRecoveryController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { requestRecoverySchema, completeRecoverySchema } = require('../utils/validators');
const { ROLES } = require('../config/constants');

router.post('/request', authenticate, validate(requestRecoverySchema), requestRecovery);
router.get('/pending', authenticate, authorize(ROLES.AUTHORITY, ROLES.SUPER_ADMIN), getPendingRecoveries);
router.put('/:id/verify', authenticate, authorize(ROLES.AUTHORITY, ROLES.SUPER_ADMIN), verifyIdentity);
router.put('/:id/complete', authenticate, authorize(ROLES.AUTHORITY, ROLES.SUPER_ADMIN), validate(completeRecoverySchema), completeRecovery);
router.put('/:id/reject', authenticate, authorize(ROLES.AUTHORITY, ROLES.SUPER_ADMIN), rejectRecovery);

module.exports = router;
