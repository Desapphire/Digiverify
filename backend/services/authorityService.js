/**
 * Authority Service — Government authority actions.
 */

const Property = require('../models/Property');
const SaleTransaction = require('../models/SaleTransaction');
const saleService = require('./saleService');
const AppError = require('../utils/AppError');

/**
 * Approve a property registration.
 */
const approveProperty = async (propertyId) => {
    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found.', 404);
    return Property.updateStatus(propertyId, 'active');
};

/**
 * Approve a sale transaction (authority signature).
 */
const approveSaleTransaction = async (saleId, authorityWallet, signatureHash) => {
    return saleService.approveSale(saleId, authorityWallet, signatureHash);
};

/**
 * Reject a sale transaction.
 */
const rejectSaleTransaction = async (saleId) => {
    const sale = await SaleTransaction.findById(saleId);
    if (!sale) throw new AppError('Sale transaction not found.', 404);
    saleService.validateTransition(sale.status, 'cancelled');
    return SaleTransaction.updateStatus(saleId, 'cancelled');
};

/**
 * Set encumbrance on a property.
 */
const setEncumbrance = async (propertyId, flag) => {
    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found.', 404);
    return Property.setEncumbrance(propertyId, flag);
};

/**
 * Confirm funds are blocked (bank verification by authority).
 */
const confirmFundsBlocked = async (saleId) => {
    const sale = await SaleTransaction.findById(saleId);
    if (!sale) throw new AppError('Sale transaction not found.', 404);

    if (!sale.fundsBlocked) {
        throw new AppError('Funds are not yet blocked.', 400);
    }

    return sale;
};

module.exports = {
    approveProperty,
    approveSaleTransaction,
    rejectSaleTransaction,
    setEncumbrance,
    confirmFundsBlocked,
};
