/**
 * Authority Routes
 */
const express = require('express');
const router = express.Router();
const { approveProperty, approveSale, rejectSale, setEncumbrance } = require('../controllers/authorityController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const { ROLES } = require('../config/constants');

router.put('/property/:id/approve', authenticate, authorize(ROLES.AUTHORITY, ROLES.SUPER_ADMIN), approveProperty);
router.post('/sale/:id/approve', authenticate, authorize(ROLES.AUTHORITY, ROLES.SUPER_ADMIN), approveSale);
router.post('/sale/:id/reject', authenticate, authorize(ROLES.AUTHORITY, ROLES.SUPER_ADMIN), rejectSale);
router.put('/property/:id/encumbrance', authenticate, authorize(ROLES.AUTHORITY, ROLES.SUPER_ADMIN), setEncumbrance);

module.exports = router;
