/**
 * Blockchain Event Listener — Polls on-chain events and syncs to PostgreSQL.
 *
 * Uses queryFilter (polling) instead of real-time filters since
 * public Avalanche RPCs don't support eth_newFilter / eth_getFilterChanges.
 */

const { getContracts } = require('../blockchain/contracts');
const Property = require('../models/Property');
const AuditLog = require('../models/AuditLog');
const { AUDIT_ACTIONS } = require('../config/constants');

const POLL_INTERVAL_MS = 30_000; // Poll every 30 seconds
let lastBlock = 0;
let pollTimer = null;

/**
 * Poll for new events since the last checked block.
 */
const pollEvents = async () => {
    const contracts = getContracts();
    const { pool } = require('../config/db');

    try {
        const { getProvider } = require('../config/blockchain');
        const provider = getProvider();
        const currentBlock = await provider.getBlockNumber();

        if (lastBlock === 0) {
            // On first run, only look at recent blocks (last 100)
            lastBlock = Math.max(currentBlock - 100, 0);
        }

        if (currentBlock <= lastBlock) return;

        const fromBlock = lastBlock + 1;
        const toBlock = currentBlock;

        // ── LandNFT: Transfer events ──────────────────────────
        if (contracts.landNFT) {
            try {
                const events = await contracts.landNFT.queryFilter('Transfer', fromBlock, toBlock);
                for (const event of events) {
                    const [from, to, tokenId] = event.args;
                    console.log(`🔗 NFT Transfer: ${from} → ${to} (tokenId: ${tokenId})`);

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
                            txHash: event.transactionHash,
                            metadata: { from, to, tokenId: tokenId.toString() },
                        });
                    }
                }
            } catch (err) {
                // Silently skip if query fails
            }
        }

        // ── LandRegistry: PropertyRegistered events ───────────
        if (contracts.landRegistry) {
            try {
                const events = await contracts.landRegistry.queryFilter('PropertyRegistered', fromBlock, toBlock);
                for (const event of events) {
                    const [propertyCode, owner, tokenId] = event.args;
                    console.log(`🔗 Property Registered: ${propertyCode} (owner: ${owner})`);

                    const property = await Property.findByCode(propertyCode);
                    if (property) {
                        await Property.setNftTokenId(property.id, tokenId.toString());
                        await AuditLog.create({
                            actionType: AUDIT_ACTIONS.NFT_MINTED,
                            actorWallet: owner,
                            entityId: property.id,
                            entityType: 'property',
                            txHash: event.transactionHash,
                            metadata: { propertyCode, tokenId: tokenId.toString() },
                        });
                    }
                }
            } catch (err) {
                // Silently skip
            }
        }

        // ── SaleContract: SaleCompleted events ────────────────
        if (contracts.saleContract) {
            try {
                const events = await contracts.saleContract.queryFilter('SaleCompleted', fromBlock, toBlock);
                for (const event of events) {
                    const [saleId, tokenId] = event.args;
                    console.log(`🔗 Sale Completed: saleId=${saleId}, tokenId=${tokenId}`);

                    await AuditLog.create({
                        actionType: AUDIT_ACTIONS.SALE_COMPLETED,
                        entityType: 'sale_transaction',
                        txHash: event.transactionHash,
                        metadata: { onChainSaleId: saleId.toString(), tokenId: tokenId.toString() },
                    });
                }
            } catch (err) {
                // Silently skip
            }
        }

        lastBlock = toBlock;
    } catch (err) {
        // Network errors are expected with public RPCs — silently retry next cycle
    }
};

/**
 * Start polling for blockchain events.
 */
const startEventListeners = () => {
    const contracts = getContracts();

    if (!contracts.landNFT && !contracts.landRegistry && !contracts.saleContract) {
        console.warn('⚠️  No blockchain contracts configured — event polling disabled');
        return;
    }

    console.log(`📡 Event polling started (every ${POLL_INTERVAL_MS / 1000}s)`);

    // Initial poll
    pollEvents();

    // Schedule recurring polls
    pollTimer = setInterval(pollEvents, POLL_INTERVAL_MS);
};

/**
 * Stop polling.
 */
const stopEventListeners = () => {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
};

module.exports = { startEventListeners, stopEventListeners };
