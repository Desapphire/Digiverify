/**
 * Sale Routes
 */
const express = require('express');
const router = express.Router();
const {
    initiateSale, signSale, completeSale, cancelSale, getSale, getMySales,
} = require('../controllers/saleController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { initiateSaleSchema, signSaleSchema } = require('../utils/validators');
const { ROLES } = require('../config/constants');

router.post(
    '/',
    authenticate,
    authorize(ROLES.SELLER, ROLES.SUPER_ADMIN),
    validate(initiateSaleSchema),
    initiateSale
);
router.get('/my', authenticate, getMySales);
router.get('/:id', authenticate, getSale);
router.post('/:id/sign', authenticate, authorize(ROLES.BUYER, ROLES.SELLER), validate(signSaleSchema), signSale);
router.post('/:id/complete', authenticate, authorize(ROLES.AUTHORITY, ROLES.SUPER_ADMIN), completeSale);
router.post('/:id/cancel', authenticate, authorize(ROLES.BUYER, ROLES.SELLER), cancelSale);

module.exports = router;
