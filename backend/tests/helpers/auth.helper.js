const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const pool = new Pool();

// Generate a valid access token for a specific role and wallet address
const generateAuthToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            walletAddress: user.walletAddress,
            role: user.role,
            email: user.email
        },
        env.JWT.secret,
        { expiresIn: '1h' }
    );
};

// Insert a fake user directly into DB and return the generated auth header
const createTestUser = async ({
    walletAddress = '0x1234567890123456789012345678901234567890',
    role = 'buyer',
    kycStatus = 'verified',
    name = 'Test User'
} = {}) => {
    const res = await pool.query(
        `INSERT INTO users (wallet_address, name, email, role, kyc_status, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING *`,
        [walletAddress, name, `${walletAddress.substring(0, 6)}@test.com`, role, kycStatus]
    );
    const user = {
        id: res.rows[0].id,
        walletAddress: res.rows[0].wallet_address,
        role: res.rows[0].role,
        email: res.rows[0].email
    };

    return {
        user,
        token: generateAuthToken(user),
        authHeader: `Bearer ${generateAuthToken(user)}`
    };
};

// Insert a test property directly to the DB
const createTestProperty = async ({
    ownerWallet,
    status = 'active',
    surveyNumber = 'SURV-123'
} = {}) => {
    const res = await pool.query(
        `INSERT INTO properties (survey_number, owner_wallet, status)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [surveyNumber, ownerWallet, status]
    );
    return res.rows[0];
};

module.exports = {
    generateAuthToken,
    createTestUser,
    createTestProperty
};
