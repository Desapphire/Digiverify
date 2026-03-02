/**
 * Court Routes
 */
const express = require('express');
const router = express.Router();
const { freezeProperty, reverseFreezeOrder, forceTransfer } = require('../controllers/courtController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { freezePropertySchema, forceTransferSchema } = require('../utils/validators');
const { ROLES } = require('../config/constants');

router.post('/freeze', authenticate, authorize(ROLES.COURT, ROLES.SUPER_ADMIN), validate(freezePropertySchema), freezeProperty);
router.post('/reverse/:freezeOrderId', authenticate, authorize(ROLES.COURT, ROLES.SUPER_ADMIN), reverseFreezeOrder);
router.post('/force-transfer', authenticate, authorize(ROLES.COURT, ROLES.SUPER_ADMIN), validate(forceTransferSchema), forceTransfer);

module.exports = router;
