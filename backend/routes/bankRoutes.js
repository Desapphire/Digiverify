/**
 * Bank Routes
 */
const express = require('express');
const router = express.Router();
const {
    requestFundBlock, confirmFundBlock, releaseFunds, getFundBlocks,
} = require('../controllers/bankController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { requestFundBlockSchema, confirmFundBlockSchema } = require('../utils/validators');
const { ROLES } = require('../config/constants');

router.post(
    '/fund-block',
    authenticate,
    authorize(ROLES.BUYER),
    validate(requestFundBlockSchema),
    requestFundBlock
);
router.put(
    '/fund-block/:id/confirm',
    authenticate,
    authorize(ROLES.BANK_ADMIN, ROLES.SUPER_ADMIN),
    validate(confirmFundBlockSchema),
    confirmFundBlock
);
router.put(
    '/fund-block/:id/release',
    authenticate,
    authorize(ROLES.BANK_ADMIN, ROLES.SUPER_ADMIN),
    releaseFunds
);
router.get(
    '/fund-block/transaction/:transactionId',
    authenticate,
    authorize(ROLES.BUYER, ROLES.SELLER, ROLES.BANK_ADMIN, ROLES.AUTHORITY, ROLES.SUPER_ADMIN),
    getFundBlocks
);

module.exports = router;
