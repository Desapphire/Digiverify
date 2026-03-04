/**
 * Bank Routes
 */
const express = require('express');
const router = express.Router();
const {
    requestFundBlock, getFundBlocks,
} = require('../controllers/bankController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { requestFundBlockSchema } = require('../utils/validators');
const { ROLES } = require('../config/constants');

router.post(
    '/fund-block',
    authenticate,
    authorize(ROLES.USER),
    validate(requestFundBlockSchema),
    requestFundBlock
);

router.get(
    '/fund-block/transaction/:transactionId',
    authenticate,
    authorize(ROLES.USER, ROLES.BANK_ADMIN, ROLES.AUTHORITY, ROLES.SUPER_ADMIN),
    getFundBlocks
);

module.exports = router;
