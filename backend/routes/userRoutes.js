/**
 * User Routes
 */
const express = require('express');
const router = express.Router();
const { submitKyc, getProfile, bindFaceId } = require('../controllers/userController');
const { requestRecovery } = require('../controllers/walletRecoveryController');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const { updateKycSchema, requestRecoverySchema, bindFaceIdSchema } = require('../utils/validators');

router.get('/profile', authenticate, getProfile);
router.post('/kyc', authenticate, validate(updateKycSchema), submitKyc);
router.put('/face-id', authenticate, validate(bindFaceIdSchema), bindFaceId);

// Wallet Recovery (User initiated)
router.post('/recovery/request', authenticate, validate(requestRecoverySchema), requestRecovery);

module.exports = router;
