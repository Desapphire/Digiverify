/**
 * Sale Controller — Multi-sign sale workflow.
 */

const saleService = require('../services/saleService');
const SaleTransaction = require('../models/SaleTransaction');
const auditService = require('../services/auditService');
const { AUDIT_ACTIONS } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');

/**
 * POST /api/sales
 */
const initiateSale = catchAsync(async (req, res) => {
    const { transaction, txHash } = await saleService.initiateSale(req.body, req.user.walletAddress);

    await auditService.log({
        actionType: AUDIT_ACTIONS.SALE_INITIATED,
        req,
        entityId: transaction.id,
        entityType: 'sale_transaction',
    });

    return res.status(201).json({
        success: true,
        message: 'Sale initiated.',
        data: transaction,
        blockchainTxHash: txHash
    });
});

/**
 * POST /api/sales/:id/sign
 */
const signSale = catchAsync(async (req, res) => {
    // Determine signerRole based on matching wallet to the sale record, rather than a global account role
    const saleInstance = await SaleTransaction.findById(req.params.id);
    if (!saleInstance) {
        throw new AppError('Sale transaction not found.', 404);
    }

    let signerRole;
    if (req.user.walletAddress.toLowerCase() === saleInstance.buyerWallet.toLowerCase()) {
        signerRole = 'buyer';
    } else if (req.user.walletAddress.toLowerCase() === saleInstance.sellerWallet.toLowerCase()) {
        signerRole = 'seller';
    } else {
        throw new AppError('You are not authorized to sign this transaction.', 403);
    }

    const { sale, txHash } = await saleService.signSale(
        req.params.id,
        req.user.walletAddress,
        signerRole,
        req.body.signatureHash
    );

    const actionType = signerRole === 'buyer'
        ? AUDIT_ACTIONS.SALE_BUYER_SIGNED
        : AUDIT_ACTIONS.SALE_SELLER_SIGNED;

    await auditService.log({
        actionType,
        req,
        entityId: req.params.id,
        entityType: 'sale_transaction',
    });

    return res.status(200).json({
        success: true,
        message: `Sale signed by ${signerRole}.`,
        data: sale,
        blockchainTxHash: txHash
    });
});

/**
 * POST /api/sales/:id/complete
 */
const completeSale = catchAsync(async (req, res) => {
    const { sale, txHash } = await saleService.completeSale(req.params.id);

    await auditService.log({
        actionType: AUDIT_ACTIONS.SALE_COMPLETED,
        req,
        entityId: req.params.id,
        entityType: 'sale_transaction',
    });

    return res.status(200).json({
        success: true,
        message: 'Sale completed. Ownership transferred.',
        data: sale,
        blockchainTxHash: txHash
    });
});

/**
 * POST /api/sales/:id/cancel
 */
const cancelSale = catchAsync(async (req, res) => {
    const sale = await saleService.cancelSale(req.params.id, req.user.walletAddress);

    await auditService.log({
        actionType: AUDIT_ACTIONS.SALE_CANCELLED,
        req,
        entityId: req.params.id,
        entityType: 'sale_transaction',
    });

    return res.status(200).json({
        success: true,
        message: 'Sale cancelled.',
        data: sale,
    });
});

/**
 * GET /api/sales/:id
 */
const getSale = catchAsync(async (req, res) => {
    const sale = await saleService.getSaleDetails(req.params.id);

    return res.status(200).json({
        success: true,
        data: sale,
    });
});

/**
 * GET /api/sales/my
 */
const getMySales = catchAsync(async (req, res) => {
    const sales = await SaleTransaction.findByWallet(req.user.walletAddress);

    return res.status(200).json({
        success: true,
        data: sales,
    });
});

/**
 * GET /api/sales/property/:propertyId
 */
const getByProperty = catchAsync(async (req, res) => {
    const sales = await SaleTransaction.findByProperty(req.params.propertyId);

    return res.status(200).json({
        success: true,
        data: sales,
    });
});

module.exports = { initiateSale, signSale, completeSale, cancelSale, getSale, getMySales, getByProperty };
