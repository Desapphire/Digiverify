/**
 * User Model — Data access layer for the users table.
 */

const { pool } = require('../config/db');
const crypto = require('crypto');

const mapUser = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        walletAddress: row.wallet_address,
        name: row.name,
        email: row.email,
        phone: row.phone,
        governmentIdHash: row.government_id_hash,
        governmentIdType: row.government_id_type,
        houseNumber: row.house_number,
        locality: row.locality,
        city: row.city,
        pinCode: row.pin_code,
        state: row.state,
        country: row.country,
        role: row.role,
        authNonce: row.auth_nonce,
        kycStatus: row.kyc_status,
        kycDocumentHash: row.kyc_document_hash,
        faceVerified: row.face_verified,
        faceIdHash: row.face_id_hash,
        birthdate: row.birthdate,
        fatherSpouseName: row.father_spouse_name,
        panNumber: row.pan_number,
        nomineeName: row.nominee_name,
        nomineeWallet: row.nominee_wallet,
        domicileState: row.domicile_state,
        emergencyContactPhone: row.emergency_contact_phone,
        preferredLanguage: row.preferred_language || 'en',
        isActive: row.is_active,
        adminComments: row.admin_comments,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
};

const findByWallet = async (walletAddress) => {
    if (!walletAddress) return null;
    const result = await pool.query(
        'SELECT * FROM users WHERE LOWER(wallet_address) = LOWER($1) LIMIT 1',
        [walletAddress]
    );
    return mapUser(result.rows[0]);
};

const findById = async (id) => {
    const result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    return mapUser(result.rows[0]);
};

const findByEmail = async (email) => {
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
    return mapUser(result.rows[0]);
};

const findByRole = async (role) => {
    const result = await pool.query('SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC', [role]);
    return result.rows.map(mapUser);
};

const findByKycStatus = async (kycStatus) => {
    const result = await pool.query(
        'SELECT * FROM users WHERE kyc_status = $1 ORDER BY created_at DESC',
        [kycStatus]
    );
    return result.rows.map(mapUser);
};

const findAll = async (limit = 50, offset = 0) => {
    const result = await pool.query(
        'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
    );
    return result.rows.map(mapUser);
};

const create = async ({
    walletAddress, name, email, password, phone, governmentIdHash, governmentIdType,
    houseNumber, locality, city, pinCode, state, country, role, authNonce, birthdate,
}) => {
    const id = crypto.randomUUID();
    const normalizedWallet = walletAddress ? walletAddress.toLowerCase() : null;
    const result = await pool.query(
        `INSERT INTO users (id, wallet_address, name, email, password, phone, government_id_hash, government_id_type,
         house_number, locality, city, pin_code, state, country, role, auth_nonce, birthdate)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING *`,
        [id, normalizedWallet, name, email, password || null, phone || null, governmentIdHash || null, governmentIdType || null,
         houseNumber || null, locality || null, city || null, pinCode || null, state || null, country || null,
         role || 'user', authNonce || null, birthdate || null]
    );
    return mapUser(result.rows[0]);
};

const updateNonce = async (walletAddress, nonce) => {
    const result = await pool.query(
        `UPDATE users SET auth_nonce = $1, updated_at = NOW()
     WHERE LOWER(wallet_address) = LOWER($2) RETURNING *`,
        [nonce, walletAddress]
    );
    return mapUser(result.rows[0]);
};

// Update nonce by user ID (used when wallet address is not yet set)
const updateNonceById = async (userId, nonce) => {
    const result = await pool.query(
        `UPDATE users SET auth_nonce = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
        [nonce, userId]
    );
    return mapUser(result.rows[0]);
};

const updateKycStatus = async (id, kycStatus, kycDocumentHash, adminComments = null) => {
    let result;
    if (adminComments !== null) {
        result = await pool.query(
            `UPDATE users SET kyc_status = $1, kyc_document_hash = COALESCE($2, kyc_document_hash), admin_comments = $3, updated_at = NOW()
         WHERE id = $4 RETURNING *`,
            [kycStatus, kycDocumentHash, adminComments, id]
        );
    } else {
        result = await pool.query(
            `UPDATE users SET kyc_status = $1, kyc_document_hash = COALESCE($2, kyc_document_hash), updated_at = NOW()
         WHERE id = $3 RETURNING *`,
            [kycStatus, kycDocumentHash, id]
        );
    }
    return mapUser(result.rows[0]);
};

const updateWallet = async (id, newWallet) => {
    const normalizedWallet = newWallet ? newWallet.toLowerCase() : null;
    const result = await pool.query(
        `UPDATE users SET wallet_address = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
        [normalizedWallet, id]
    );
    return mapUser(result.rows[0]);
};

const updateFaceVerified = async (id, faceVerified) => {
    const result = await pool.query(
        `UPDATE users SET face_verified = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
        [faceVerified, id]
    );
    return mapUser(result.rows[0]);
};

const updateFaceIdHash = async (id, faceIdHash) => {
    const result = await pool.query(
        `UPDATE users SET face_id_hash = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
        [faceIdHash, id]
    );
    return mapUser(result.rows[0]);
};

const updateProfile = async (id, { 
    email, phone, houseNumber, locality, city, pinCode, state, country,
    fatherSpouseName, panNumber, nomineeName, nomineeWallet, domicileState, emergencyContactPhone, preferredLanguage 
}) => {
    const result = await pool.query(
        `UPDATE users SET 
            email = COALESCE($1, email), 
            phone = COALESCE($2, phone), 
            house_number = COALESCE($3, house_number), 
            locality = COALESCE($4, locality), 
            city = COALESCE($5, city), 
            pin_code = COALESCE($6, pin_code), 
            state = COALESCE($7, state), 
            country = COALESCE($8, country),
            father_spouse_name = COALESCE($9, father_spouse_name),
            pan_number = COALESCE($10, pan_number),
            nominee_name = COALESCE($11, nominee_name),
            nominee_wallet = COALESCE($12, nominee_wallet),
            domicile_state = COALESCE($13, domicile_state),
            emergency_contact_phone = COALESCE($14, emergency_contact_phone),
            preferred_language = COALESCE($15, preferred_language),
            updated_at = NOW()
     WHERE id = $16 RETURNING *`,
        [
            email, phone, houseNumber, locality, city, pinCode, state, country,
            fatherSpouseName, panNumber, nomineeName, nomineeWallet, domicileState, emergencyContactPhone, preferredLanguage,
            id
        ]
    );
    return mapUser(result.rows[0]);
};

const deactivate = async (id) => {
    const result = await pool.query(
        'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
    );
    return mapUser(result.rows[0]);
};

const findByEmailForLogin = async (email) => {
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
    return result.rows[0] ? { ...mapUser(result.rows[0]), password: result.rows[0].password } : null;
};

module.exports = {
    findByWallet,
    findById,
    findByEmail,
    findByEmailForLogin,
    findByRole,
    findByKycStatus,
    findAll,
    create,
    updateNonce,
    updateNonceById,
    updateKycStatus,
    updateWallet,
    updateProfile,
    updateFaceVerified,
    updateFaceIdHash,
    deactivate,
};
