/**
 * User Routes
 */
const express = require('express');
const router = express.Router();
const { register, submitKyc, approveKyc, rejectKyc, getProfile } = require('../controllers/userController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { registerUserSchema, updateKycSchema } = require('../utils/validators');
const { ROLES } = require('../config/constants');

router.post('/register', validate(registerUserSchema), register);
router.get('/profile', authenticate, getProfile);
router.post('/kyc', authenticate, validate(updateKycSchema), submitKyc);
router.put('/:id/kyc/approve', authenticate, authorize(ROLES.AUTHORITY, ROLES.SUPER_ADMIN), approveKyc);
router.put('/:id/kyc/reject', authenticate, authorize(ROLES.AUTHORITY, ROLES.SUPER_ADMIN), rejectKyc);

module.exports = router;
