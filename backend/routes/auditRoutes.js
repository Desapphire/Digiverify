/**
 * Audit Routes
 */
const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const { ROLES } = require('../config/constants');

router.get('/', authenticate, authorize(ROLES.AUTHORITY, ROLES.SUPER_ADMIN, ROLES.COURT), getAuditLogs);

module.exports = router;
