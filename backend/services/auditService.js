/**
 * Audit Service — Central audit logger used by all modules.
 */

const AuditLog = require('../models/AuditLog');

/**
 * Log an audit event.
 * @param {object} params
 * @param {string} params.actionType - From AUDIT_ACTIONS constant.
 * @param {object} req - Express request (for IP + user context).
 * @param {string} [params.entityId] - Property or transaction UUID.
 * @param {string} [params.entityType] - 'property', 'sale_transaction', 'user', etc.
 * @param {string} [params.txHash] - Blockchain tx hash if applicable.
 * @param {object} [params.metadata] - Additional context.
 * @param {object} [client] - DB client for transactional writes.
 */
const log = async ({ actionType, req, entityId, entityType, txHash, metadata }, client = null) => {
    const actorWallet = req?.user?.walletAddress || null;
    const actorUserId = req?.user?.id || null;
    const ipAddress = req?.ip || req?.connection?.remoteAddress || null;

    return AuditLog.create({
        actionType,
        actorWallet,
        actorUserId,
        ipAddress,
        entityId,
        entityType,
        txHash,
        metadata,
    }, client);
};

/**
 * Query audit logs with filters.
 */
const queryLogs = async (filters) => {
    return AuditLog.query(filters);
};

module.exports = { log, queryLogs };
