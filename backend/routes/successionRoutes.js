/**
 * Succession Routes
 * Legal Heir Succession Claims and Court Partition
 */

const express = require('express');
const router = express.Router();
const successionController = require('../controllers/successionController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { fileSuccessionClaimSchema, reviewSuccessionSchema } = require('../utils/validators');
const { ROLES } = require('../config/constants');

// Extend timeout for Sepolia blockchain transactions
const longTimeout = (req, res, next) => {
    if (res.extendTimeout) res.extendTimeout(300000);
    req.setTimeout(300000);
    res.setTimeout(300000);
    next();
};

// Citizen or Officer can file succession claim
router.post(
    '/claims',
    longTimeout,
    authenticate,
    authorize(ROLES.USER, ROLES.AUTHORITY, ROLES.SUPER_ADMIN),
    validate(fileSuccessionClaimSchema),
    successionController.fileClaim
);

// View claims (Citizen sees relevant, Officer sees all)
router.get(
    '/claims',
    authenticate,
    authorize(ROLES.USER, ROLES.AUTHORITY, ROLES.SUPER_ADMIN),
    successionController.getClaims
);

router.get(
    '/claims/:id',
    authenticate,
    authorize(ROLES.USER, ROLES.AUTHORITY, ROLES.SUPER_ADMIN),
    successionController.getClaimById
);

// Revenue Officer review & execution actions
router.put(
    '/claims/:id/approve',
    longTimeout,
    authenticate,
    authorize(ROLES.AUTHORITY, ROLES.SUPER_ADMIN),
    validate(reviewSuccessionSchema),
    successionController.approveClaim
);

router.put(
    '/claims/:id/execute',
    longTimeout,
    authenticate,
    authorize(ROLES.AUTHORITY, ROLES.SUPER_ADMIN),
    successionController.executeClaim
);

router.put(
    '/claims/:id/reject',
    authenticate,
    authorize(ROLES.AUTHORITY, ROLES.SUPER_ADMIN),
    validate(reviewSuccessionSchema),
    successionController.rejectClaim
);

module.exports = router;
