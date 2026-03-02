/**
 * Blockchain Event Listener — Syncs on-chain events to PostgreSQL.
 */

const { getContracts } = require('../blockchain/contracts');
const Property = require('../models/Property');
const AuditLog = require('../models/AuditLog');
const { AUDIT_ACTIONS } = require('../config/constants');

/**
 * Start listening for blockchain events.
 * Gracefully skips if contracts aren't configured.
 */
const startEventListeners = () => {
    const contracts = getContracts();

    // ── LandNFT: Transfer events ──────────────────────────
    if (contracts.landNFT) {
        contracts.landNFT.on('Transfer', async (from, to, tokenId, event) => {
            try {
                console.log(`🔗 NFT Transfer: ${from} → ${to} (tokenId: ${tokenId})`);

                // Update property owner in DB if we can find it by tokenId
                const { pool } = require('../config/db');
                const result = await pool.query(
                    'SELECT id FROM properties WHERE nft_token_id = $1 LIMIT 1',
                    [tokenId.toString()]
                );

                if (result.rows[0]) {
                    await Property.updateOwner(result.rows[0].id, to);

                    await AuditLog.create({
                        actionType: AUDIT_ACTIONS.OWNERSHIP_TRANSFERRED,
                        actorWallet: from,
                        entityId: result.rows[0].id,
                        entityType: 'property',
                        txHash: event.log?.transactionHash || null,
                        metadata: { from, to, tokenId: tokenId.toString() },
                    });
                }
            } catch (err) {
                console.error('❌ Event handler error (Transfer):', err.message);
            }
        });

        console.log('📡 Listening for LandNFT Transfer events');
    }

    // ── LandRegistry: PropertyRegistered events ───────────
    if (contracts.landRegistry) {
        contracts.landRegistry.on('PropertyRegistered', async (propertyCode, owner, tokenId, event) => {
            try {
                console.log(`🔗 Property Registered on-chain: ${propertyCode} (owner: ${owner})`);

                // Update the property's NFT token ID
                const property = await Property.findByCode(propertyCode);
                if (property) {
                    await Property.setNftTokenId(property.id, tokenId.toString());

                    await AuditLog.create({
                        actionType: AUDIT_ACTIONS.NFT_MINTED,
                        actorWallet: owner,
                        entityId: property.id,
                        entityType: 'property',
                        txHash: event.log?.transactionHash || null,
                        metadata: { propertyCode, tokenId: tokenId.toString() },
                    });
                }
            } catch (err) {
                console.error('❌ Event handler error (PropertyRegistered):', err.message);
            }
        });

        console.log('📡 Listening for LandRegistry PropertyRegistered events');
    }

    // ── SaleContract: SaleCompleted events ────────────────
    if (contracts.saleContract) {
        contracts.saleContract.on('SaleCompleted', async (saleId, tokenId, event) => {
            try {
                console.log(`🔗 Sale Completed on-chain: saleId=${saleId}, tokenId=${tokenId}`);

                await AuditLog.create({
                    actionType: AUDIT_ACTIONS.SALE_COMPLETED,
                    entityType: 'sale_transaction',
                    txHash: event.log?.transactionHash || null,
                    metadata: { onChainSaleId: saleId.toString(), tokenId: tokenId.toString() },
                });
            } catch (err) {
                console.error('❌ Event handler error (SaleCompleted):', err.message);
            }
        });

        console.log('📡 Listening for SaleContract SaleCompleted events');
    }

    if (!contracts.landNFT && !contracts.landRegistry && !contracts.saleContract) {
        console.warn('⚠️  No blockchain contracts configured — event listeners disabled');
    }
};

module.exports = { startEventListeners };
