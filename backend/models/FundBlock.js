/**
 * Fund Block Model — ASBA-style data access.
 */

const { pool } = require('../config/db');

const mapFundBlock = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        transactionId: row.transaction_id,
        bankReferenceId: row.bank_reference_id,
        buyerWallet: row.buyer_wallet,
        blockAmount: parseFloat(row.block_amount),
        currency: row.currency,
        blockedAt: row.blocked_at,
        unblockedAt: row.unblocked_at,
        bankConfirmed: row.bank_confirmed,
        bankConfirmTs: row.bank_confirm_ts,
        status: row.status,
        bankUserId: row.bank_user_id,
    };
};

const create = async (data, client = null) => {
    const db = client || pool;
    const result = await db.query(
        `INSERT INTO fund_blocks (transaction_id, buyer_wallet, block_amount, currency)
     VALUES ($1,$2,$3,$4) RETURNING *`,
        [data.transactionId, data.buyerWallet, data.blockAmount, data.currency || 'INR']
    );
    return mapFundBlock(result.rows[0]);
};

const findById = async (id) => {
    const result = await pool.query('SELECT * FROM fund_blocks WHERE id = $1 LIMIT 1', [id]);
    return mapFundBlock(result.rows[0]);
};

const findByTransaction = async (transactionId) => {
    const result = await pool.query(
        'SELECT * FROM fund_blocks WHERE transaction_id = $1 ORDER BY blocked_at DESC',
        [transactionId]
    );
    return result.rows.map(mapFundBlock);
};

const confirmBlock = async (id, bankReferenceId, bankUserId, client = null) => {
    const db = client || pool;
    const result = await db.query(
        `UPDATE fund_blocks
     SET bank_confirmed = TRUE, bank_reference_id = $1, bank_user_id = $2,
         bank_confirm_ts = NOW(), status = 'blocked'
     WHERE id = $3 RETURNING *`,
        [bankReferenceId, bankUserId, id]
    );
    return mapFundBlock(result.rows[0]);
};

const release = async (id, client = null) => {
    const db = client || pool;
    const result = await db.query(
        `UPDATE fund_blocks
     SET status = 'released', unblocked_at = NOW()
     WHERE id = $1 RETURNING *`,
        [id]
    );
    return mapFundBlock(result.rows[0]);
};

const markFailed = async (id, client = null) => {
    const db = client || pool;
    const result = await db.query(
        `UPDATE fund_blocks SET status = 'failed' WHERE id = $1 RETURNING *`,
        [id]
    );
    return mapFundBlock(result.rows[0]);
};

module.exports = { create, findById, findByTransaction, confirmBlock, release, markFailed };
