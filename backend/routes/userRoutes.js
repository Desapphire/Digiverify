/**
 * User Routes
 */
const express = require('express');
const router = express.Router();
const { submitKyc, getProfile, updateProfile, bindFaceId, getMyNotifications } = require('../controllers/userController');
const { requestRecovery, getMyRecoveries } = require('../controllers/walletRecoveryController');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const { updateKycSchema, updateProfileSchema, requestRecoverySchema, bindFaceIdSchema } = require('../utils/validators');

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
router.post('/kyc', authenticate, validate(updateKycSchema), submitKyc);
router.put('/face-id', authenticate, validate(bindFaceIdSchema), bindFaceId);

// Notifications
router.get('/notifications', authenticate, getMyNotifications);

// Wallet Recovery (User initiated)
router.get('/recovery', authenticate, getMyRecoveries);
router.post('/recovery/request', authenticate, validate(requestRecoverySchema), requestRecovery);

module.exports = router;
