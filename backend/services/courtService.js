/**
 * Court Service — Judicial actions on properties and transactions.
 */

const { pool } = require('../config/db');
const { withTransaction } = require('../config/db');
const Property = require('../models/Property');
const SaleTransaction = require('../models/SaleTransaction');
const saleService = require('./saleService');
const contractService = require('../blockchain/contractService');
const AppError = require('../utils/AppError');

/**
 * Freeze a property by court order.
 */
const freezeProperty = async ({ propertyId, courtOrderHash, caseNumber, reason }, courtUserId) => {
    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found.', 404);

    return withTransaction(async (client) => {
        // Insert freeze order
        const result = await client.query(
            `INSERT INTO court_freeze_orders (property_id, court_user_id, court_order_hash, case_number, reason)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [propertyId, courtUserId, courtOrderHash, caseNumber || null, reason || null]
        );

        // Update property status
        await Property.updateStatus(propertyId, 'frozen', client);

        // ── Blockchain: Judicial Freeze on-chain ──────────────
        if (property.nftTokenId) {
            try {
                await contractService.courtFreezeProperty(property.nftTokenId, reason || 'Judicial Order');
                console.log(`✅ On-chain freeze ordered for property ${propertyId}`);
            } catch (err) {
                console.error('⚠️ On-chain freeze failed:', err.message);
            }
        }

        // Freeze any active sale
        const activeSale = await SaleTransaction.findActiveByProperty(propertyId);
        if (activeSale) {
            try {
                // Cancel/Freeze sale on-chain as well
                if (activeSale.onChainId) {
                    await contractService.courtCancelSale(activeSale.onChainId, reason || 'Judicial Order');
                }
                await saleService.freezeSale(activeSale.id);
            } catch (e) {
                console.warn('⚠️ Could not freeze active sale:', e.message);
            }
        }

        return result.rows[0];
    });
};

/**
 * Reverse a court freeze.
 */
const reverseFreezeOrder = async (propertyOrFreezeId, { courtOrderHash, reversalOrderHash, reason }, courtUserId) => {
    // Accept either field name from the frontend
    const orderHash = reversalOrderHash || courtOrderHash;

    // The frontend sends the property ID (not the freeze order UUID).
    // Find the most recent active freeze order for this property.
    const freezeResult = await pool.query(
        `SELECT * FROM court_freeze_orders
         WHERE (id = $1 OR property_id = $1) AND is_active = TRUE
         ORDER BY frozen_at DESC LIMIT 1`,
        [propertyOrFreezeId]
    );
    const freezeOrder = freezeResult.rows[0];
    if (!freezeOrder) throw new AppError('No active freeze order found for this property.', 404);

    const freezeOrderId = freezeOrder.id; // use the real freeze order UUID from here on

    return withTransaction(async (client) => {
        // Deactivate freeze order
        await client.query(
            'UPDATE court_freeze_orders SET is_active = FALSE WHERE id = $1',
            [freezeOrderId]
        );

        // Get current property owner
        const property = await Property.findById(freezeOrder.property_id);

        // ── Blockchain: Judicial Unfreeze logic if contract supports it ──
        // (Currently CourtOverride focuses on Freeze/Transfer/Cancel)

        // Insert reversal record
        const result = await client.query(
            `INSERT INTO court_reversals
       (freeze_order_id, property_id, court_user_id, reversal_order_hash, previous_owner_wallet, reason)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [freezeOrderId, freezeOrder.property_id, courtUserId, orderHash,
                property?.ownerWallet || null, reason || null]
        );

        // Check if any other active freeze orders exist for this property
        const otherFreezes = await client.query(
            'SELECT COUNT(*)::int AS count FROM court_freeze_orders WHERE property_id = $1 AND is_active = TRUE',
            [freezeOrder.property_id]
        );

        // If no more active freezes, unfreeze the property
        if (otherFreezes.rows[0].count === 0) {
            await Property.updateStatus(freezeOrder.property_id, 'active', client);
        }

        return result.rows[0];
    });
};

/**
 * Force-transfer property ownership (court override).
 */
const forceTransfer = async ({ propertyId, newOwnerWallet, courtOrderHash, reason }, courtUserId) => {
    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found.', 404);

    return withTransaction(async (client) => {
        // 1. Blockchain: Judicial Force Transfer on-chain
        if (property.nftTokenId) {
            try {
                await contractService.courtReverseTransfer(
                    property.nftTokenId,
                    newOwnerWallet,
                    reason || 'Court Ordered Force Transfer'
                );
                console.log(`✅ On-chain judicial transfer successful for NFT ${property.nftTokenId}`);
            } catch (err) {
                console.error('⚠️ On-chain judicial transfer failed:', err.message);
                // Non-blocking in this simulation, but usually critical
            }
        }

        // 2. Transfer ownership in DB
        await Property.updateOwner(propertyId, newOwnerWallet, client);

        // 3. Log court order
        await client.query(
            `INSERT INTO court_freeze_orders (property_id, court_user_id, court_order_hash, reason, is_active)
       VALUES ($1,$2,$3,$4, FALSE)`,
            [propertyId, courtUserId, courtOrderHash, `FORCE_TRANSFER: ${reason || 'Court ordered'}`]
        );

        return Property.findById(propertyId);
    });
};

module.exports = { freezeProperty, reverseFreezeOrder, forceTransfer };
