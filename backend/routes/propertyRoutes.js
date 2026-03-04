/**
 * Property Routes
 */
const express = require('express');
const router = express.Router();
const {
    registerProperty, getProperty, getMyProperties,
    searchProperties, uploadDocument, getDocuments,
} = require('../controllers/propertyController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { registerPropertySchema } = require('../utils/validators');
const { ROLES } = require('../config/constants');

router.post(
    '/',
    authenticate,
    authorize(ROLES.USER, ROLES.AUTHORITY, ROLES.SUPER_ADMIN),
    validate(registerPropertySchema),
    registerProperty
);
router.get('/my', authenticate, getMyProperties);
router.get('/search', authenticate, searchProperties);
router.get('/:id', authenticate, getProperty);
router.post('/:id/documents', authenticate, uploadDocument);
router.get('/:id/documents', authenticate, getDocuments);

module.exports = router;
