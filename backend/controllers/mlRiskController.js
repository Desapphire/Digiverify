/**
 * ML Risk Controller — Exposes AI/ML fraud and valuation assessment endpoints.
 */

const mlRiskService = require('../services/mlRiskService');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/risk/sale/:saleId
 * Evaluate risk for an existing sale transaction.
 */
const getSaleRiskScore = catchAsync(async (req, res) => {
    const { saleId } = req.params;
    const evaluation = await mlRiskService.assessSaleTransaction(saleId);

    return res.status(200).json({
        success: true,
        message: 'Sale risk assessment completed successfully.',
        data: evaluation,
    });
});

/**
 * GET /api/risk/property/:propertyId
 * POST /api/risk/property/:propertyId/valuation
 * Evaluate fair market price & pricing risk for a property.
 */
const getPropertyValuation = catchAsync(async (req, res) => {
    const { propertyId } = req.params;
    const proposedPrice = req.body?.proposedPrice || req.query?.proposedPrice || null;
    const forceRefresh = req.query?.refresh === 'true' || req.body?.refresh === true;
    const valuation = await mlRiskService.assessPropertyValuation(propertyId, proposedPrice, forceRefresh);

    return res.status(200).json({
        success: true,
        message: valuation.isCached 
            ? 'Property valuation retrieved from cache (computed within last 60 minutes).' 
            : 'Property valuation and risk assessment computed successfully.',
        data: valuation,
    });
});

/**
 * POST /api/risk/evaluate
 * Direct evaluation using custom or simulation inputs.
 */
const evaluateCustomRisk = catchAsync(async (req, res) => {
    const result = await mlRiskService.assessCustomRisk(req.body);

    return res.status(200).json({
        success: true,
        message: 'Custom risk analysis completed.',
        data: result,
    });
});

module.exports = {
    getSaleRiskScore,
    getPropertyValuation,
    evaluateCustomRisk,
};
