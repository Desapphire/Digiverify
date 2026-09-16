/**
 * Sale Transaction Model — Data access layer.
 */

const { pool } = require('../config/db');

const mapSale = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        propertyId: row.property_id,
        buyerWallet: row.buyer_wallet,
        sellerWallet: row.seller_wallet,
        salePrice: parseFloat(row.sale_price),
        buyerSigned: row.buyer_signed,
        sellerSigned: row.seller_signed,
        authoritySigned: row.authority_signed,
        fundsBlocked: row.funds_blocked,
        smartContractAddr: row.smart_contract_addr,
        txHash: row.tx_hash,
        onChainId: row.on_chain_id,
        riskScore: row.risk_score ? parseFloat(row.risk_score) : null,
        riskLevel: row.risk_level || null,
        riskReport: row.risk_report || null,
        status: row.status,
        expiryAt: row.expiry_at,
        adminComments: row.admin_comments,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        // Joined Property Fields
        propertyCode: row.property_code,
        surveyNumber: row.survey_number,
        district: row.district,
        state: row.state,
        nftTokenId: row.nft_token_id,
        areaSqft: row.area_sqft ? parseFloat(row.area_sqft) : null,
        estimatedFairPrice: row.estimated_fair_price ? parseFloat(row.estimated_fair_price) : null,
    };
};

const create = async (data, client = null) => {
    const db = client || pool;
    const expiryAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const result = await db.query(
        `INSERT INTO sale_transactions
     (property_id, buyer_wallet, seller_wallet, sale_price, expiry_at, risk_score, risk_level, risk_report)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
        [
            data.propertyId,
            data.buyerWallet,
            data.sellerWallet,
            data.salePrice,
            expiryAt,
            data.riskScore || null,
            data.riskLevel || null,
            data.riskReport ? JSON.stringify(data.riskReport) : null
        ]
    );
    return mapSale(result.rows[0]);
};

const findAll = async (limit = 50, offset = 0) => {
    const result = await pool.query(
        `SELECT st.*, p.property_code, p.survey_number, p.district, p.state, p.nft_token_id, p.area_sqft, p.estimated_fair_price 
         FROM sale_transactions st
         LEFT JOIN properties p ON st.property_id = p.id
         ORDER BY st.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
    );
    return result.rows.map(mapSale);
};

const findById = async (id, client = null) => {
    const db = client || pool;
    const result = await db.query(
        `SELECT st.*, p.property_code, p.survey_number, p.district, p.state, p.nft_token_id, p.area_sqft, p.estimated_fair_price 
         FROM sale_transactions st
         LEFT JOIN properties p ON st.property_id = p.id
         WHERE st.id = $1 LIMIT 1`,
        [id]
    );
    return mapSale(result.rows[0]);
};

const findByProperty = async (propertyId) => {
    const result = await pool.query(
        `SELECT st.*, p.property_code, p.survey_number, p.district, p.state, p.nft_token_id, p.area_sqft, p.estimated_fair_price 
         FROM sale_transactions st
         LEFT JOIN properties p ON st.property_id = p.id
         WHERE st.property_id = $1 ORDER BY st.created_at DESC`,
        [propertyId]
    );
    return result.rows.map(mapSale);
};

const findByWallet = async (walletAddress) => {
    const result = await pool.query(
        `SELECT st.*, p.property_code, p.survey_number, p.district, p.state, p.nft_token_id, p.area_sqft, p.estimated_fair_price 
         FROM sale_transactions st
         LEFT JOIN properties p ON st.property_id = p.id
         WHERE LOWER(st.buyer_wallet) = LOWER($1) OR LOWER(st.seller_wallet) = LOWER($1)
         ORDER BY st.created_at DESC`,
        [walletAddress]
    );
    return result.rows.map(mapSale);
};

const findActiveByProperty = async (propertyId) => {
    const result = await pool.query(
        `SELECT * FROM sale_transactions
     WHERE property_id = $1 AND status NOT IN ('completed','cancelled','expired')
     LIMIT 1`,
        [propertyId]
    );
    return mapSale(result.rows[0]);
};

const updateStatus = async (id, status, adminComments = null, client = null) => {
    // If 3rd param is actually a pg client/connection
    if (adminComments && typeof adminComments.query === 'function' && !client) {
        client = adminComments;
        adminComments = null;
    }
    const db = client || pool;
    let result;
    if (adminComments !== null && typeof adminComments === 'string') {
        result = await db.query(
            'UPDATE sale_transactions SET status = $1, admin_comments = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
            [status, adminComments, id]
        );
    } else {
        result = await db.query(
            'UPDATE sale_transactions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, id]
        );
    }
    return mapSale(result.rows[0]);
};

const setBuyerSigned = async (id, client = null) => {
    const db = client || pool;
    const result = await db.query(
        'UPDATE sale_transactions SET buyer_signed = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
    );
    return mapSale(result.rows[0]);
};

const setSellerSigned = async (id, client = null) => {
    const db = client || pool;
    const result = await db.query(
        'UPDATE sale_transactions SET seller_signed = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
    );
    return mapSale(result.rows[0]);
};

const setAuthoritySigned = async (id, client = null) => {
    const db = client || pool;
    const result = await db.query(
        'UPDATE sale_transactions SET authority_signed = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
    );
    return mapSale(result.rows[0]);
};

const setFundsBlocked = async (id, client = null) => {
    const db = client || pool;
    const result = await db.query(
        'UPDATE sale_transactions SET funds_blocked = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
    );
    return mapSale(result.rows[0]);
};

const setTxHash = async (id, txHash, client = null) => {
    const db = client || pool;
    const result = await db.query(
        'UPDATE sale_transactions SET tx_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [txHash, id]
    );
    return mapSale(result.rows[0]);
};

// ── Multi-Sig Approvals ─────────────────────────────────
const addApproval = async ({ transactionId, signerWallet, signerRole, signatureHash }, client = null) => {
    const db = client || pool;
    const result = await db.query(
        `INSERT INTO multi_sig_approvals (transaction_id, signer_wallet, signer_role, signature_hash)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (transaction_id, signer_role) DO NOTHING
     RETURNING *`,
        [transactionId, signerWallet, signerRole, signatureHash]
    );
    return result.rows[0] || null;
};

const getApprovals = async (transactionId) => {
    const result = await pool.query(
        'SELECT * FROM multi_sig_approvals WHERE transaction_id = $1',
        [transactionId]
    );
    return result.rows;
};

const setOnChainId = async (id, onChainId, client = null) => {
    const db = client || pool;
    const result = await db.query(
        'UPDATE sale_transactions SET on_chain_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [onChainId, id]
    );
    return mapSale(result.rows[0]);
};

const updateRiskReport = async (id, riskScore, riskLevel, riskReport, client = null) => {
    const db = client || pool;
    const result = await db.query(
        'UPDATE sale_transactions SET risk_score = $1, risk_level = $2, risk_report = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
        [riskScore, riskLevel, JSON.stringify(riskReport), id]
    );
    return mapSale(result.rows[0]);
};

module.exports = {
    create, findById, findAll, findByProperty, findByWallet, findActiveByProperty,
    updateStatus, setBuyerSigned, setSellerSigned, setAuthoritySigned,
    setFundsBlocked, setTxHash, setOnChainId, updateRiskReport, addApproval, getApprovals,
};
