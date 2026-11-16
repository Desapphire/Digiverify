/**
 * Property Tax Routes
 * Municipal Property Tax Assessments, Dues Settlements, and On-chain 1-Year NOCs
 */

const express = require('express');
const router = express.Router();
const taxController = require('../controllers/taxController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { recordTaxAssessmentSchema, payTaxSchema } = require('../utils/validators');
const { ROLES } = require('../config/constants');

// Extend timeout for Sepolia blockchain transactions
const longTimeout = (req, res, next) => {
    if (res.extendTimeout) res.extendTimeout(300000);
    req.setTimeout(300000);
    res.setTimeout(300000);
    next();
};

// List properties with taxes
router.get(
    '/properties',
    authenticate,
    authorize(ROLES.USER, ROLES.AUTHORITY, ROLES.SUPER_ADMIN),
    taxController.getPropertiesWithTaxes
);

// Get property tax details
router.get(
    '/property/:propertyId',
    authenticate,
    authorize(ROLES.USER, ROLES.AUTHORITY, ROLES.SUPER_ADMIN),
    taxController.getPropertyTaxDetails
);

// Municipal Officer records assessment
router.post(
    '/assess',
    longTimeout,
    authenticate,
    authorize(ROLES.AUTHORITY, ROLES.SUPER_ADMIN),
    validate(recordTaxAssessmentSchema),
    taxController.recordAssessment
);

// Citizen pays dues and receives NOC
router.post(
    '/:assessmentId/pay',
    longTimeout,
    authenticate,
    authorize(ROLES.USER, ROLES.AUTHORITY, ROLES.SUPER_ADMIN),
    validate(payTaxSchema),
    taxController.payTax
);

// Get NOC Certificate details
router.get(
    '/noc/:id',
    authenticate,
    authorize(ROLES.USER, ROLES.AUTHORITY, ROLES.SUPER_ADMIN),
    taxController.getNOCById
);

module.exports = router;
