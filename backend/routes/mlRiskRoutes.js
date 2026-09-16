/**
 * ML Risk & Valuation Routes
 */

const express = require('express');
const router = express.Router();

const {
    getSaleRiskScore,
    getPropertyValuation,
    evaluateCustomRisk,
} = require('../controllers/mlRiskController');

const authenticate = require('../middlewares/authenticate');
const { riskLimiter } = require('../middlewares/rateLimiter');

// Public/authenticated evaluation routes
router.get('/sale/:saleId', riskLimiter, authenticate, getSaleRiskScore);
router.get('/property/:propertyId', riskLimiter, authenticate, getPropertyValuation);
router.post('/property/:propertyId/valuation', riskLimiter, authenticate, getPropertyValuation);
router.post('/evaluate', riskLimiter, authenticate, evaluateCustomRisk);

module.exports = router;
