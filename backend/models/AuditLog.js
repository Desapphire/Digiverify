/**
 * Audit Log Model — Append-only data access for audit trail.
 */

const { pool } = require('../config/db');

const create = async ({
    actionType, actorWallet, actorUserId, ipAddress,
    entityId, entityType, txHash, metadata,
}, client = null) => {
    const db = client || pool;
    const result = await db.query(
        `INSERT INTO audit_logs
     (action_type, actor_wallet, actor_user_id, ip_address, entity_id, entity_type, tx_hash, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
        [
            actionType,
            actorWallet || null,
            actorUserId || null,
            ipAddress || null,
            entityId || null,
            entityType || null,
            txHash || null,
            metadata ? JSON.stringify(metadata) : null,
        ]
    );
    return result.rows[0];
};

const query = async ({ actorWallet, entityId, actionType, startDate, endDate, limit = 50, offset = 0 }) => {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    let idx = 1;

    if (actorWallet) { sql += ` AND actor_wallet = $${idx++}`; params.push(actorWallet); }
    if (entityId) { sql += ` AND entity_id = $${idx++}`; params.push(entityId); }
    if (actionType) { sql += ` AND action_type = $${idx++}`; params.push(actionType); }
    if (startDate) { sql += ` AND created_at >= $${idx++}`; params.push(startDate); }
    if (endDate) { sql += ` AND created_at <= $${idx++}`; params.push(endDate); }

    sql += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const result = await pool.query(sql, params);
    return result.rows;
};

module.exports = { create, query };
