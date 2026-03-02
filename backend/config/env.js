/**
 * Central Environment Configuration
 * Loads, validates, and exports all environment variables.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const env = {
    // Server
    PORT: parseInt(process.env.PORT, 10) || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    IS_PRODUCTION: process.env.NODE_ENV === 'production',

    // PostgreSQL
    PG: {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT, 10) || 5432,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        connectionString: process.env.POSTGRES_URI || process.env.DATABASE_URL || null,
    },

    // JWT
    JWT: {
        secret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_in_production',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    // Blockchain
    BLOCKCHAIN: {
        rpcUrl: process.env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
        chainId: parseInt(process.env.CHAIN_ID, 10) || 43113,
        signerKey: process.env.SIGNER_PRIVATE_KEY || '',
        contracts: {
            landNFT: process.env.LAND_NFT_ADDRESS || '',
            landRegistry: process.env.LAND_REGISTRY_ADDRESS || '',
            saleContract: process.env.SALE_CONTRACT_ADDRESS || '',
        },
    },

    // Redis
    REDIS_URL: process.env.REDIS_URL || '',

    // CORS
    CORS_ORIGINS: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
        : ['http://localhost:3000', 'http://localhost:5173'],

    // Rate Limiting
    RATE_LIMIT: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 min
        max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    },

    // Encryption
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'dev_encryption_key_32chars_min!',

    // Session (legacy)
    SESSION_SECRET: process.env.SESSION_SECRET || 'default_session_secret',
};

// ── Validation ──────────────────────────────────────────
const requiredInProduction = ['JWT_SECRET', 'PGPASSWORD', 'ENCRYPTION_KEY'];

if (env.IS_PRODUCTION) {
    const missing = requiredInProduction.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

module.exports = env;
