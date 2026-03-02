/**
 * Wallet Recovery Model — Data access for wallet_recovery_requests.
 */

const { pool } = require('../config/db');

const mapRecovery = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        userId: row.user_id,
        oldWallet: row.old_wallet,
        newWallet: row.new_wallet,
        status: row.status,
        verifiedBy: row.verified_by,
        reason: row.reason,
        nftTransferTx: row.nft_transfer_tx,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
};

const create = async ({ userId, oldWallet, reason }, client = null) => {
    const db = client || pool;
    const result = await db.query(
        `INSERT INTO wallet_recovery_requests (user_id, old_wallet, reason)
     VALUES ($1,$2,$3) RETURNING *`,
        [userId, oldWallet, reason]
    );
    return mapRecovery(result.rows[0]);
};

const findById = async (id) => {
    const result = await pool.query('SELECT * FROM wallet_recovery_requests WHERE id = $1 LIMIT 1', [id]);
    return mapRecovery(result.rows[0]);
};

const findByUser = async (userId) => {
    const result = await pool.query(
        'SELECT * FROM wallet_recovery_requests WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
    );
    return result.rows.map(mapRecovery);
};

const findPending = async () => {
    const result = await pool.query(
        `SELECT * FROM wallet_recovery_requests WHERE status IN ('requested','identity_verified')
     ORDER BY created_at ASC`
    );
    return result.rows.map(mapRecovery);
};

const updateStatus = async (id, status, verifiedBy, client = null) => {
    const db = client || pool;
    const result = await db.query(
        `UPDATE wallet_recovery_requests
     SET status = $1, verified_by = $2, updated_at = NOW()
     WHERE id = $3 RETURNING *`,
        [status, verifiedBy, id]
    );
    return mapRecovery(result.rows[0]);
};

const complete = async (id, newWallet, nftTransferTx, client = null) => {
    const db = client || pool;
    const result = await db.query(
        `UPDATE wallet_recovery_requests
     SET new_wallet = $1, nft_transfer_tx = $2, status = 'completed', updated_at = NOW()
     WHERE id = $3 RETURNING *`,
        [newWallet, nftTransferTx, id]
    );
    return mapRecovery(result.rows[0]);
};

module.exports = { create, findById, findByUser, findPending, updateStatus, complete };
