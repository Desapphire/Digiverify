// tests/setup.js

const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');

// Mock environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_for_jwt_signing';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_for_jwt_signing';
// Set dummy values for DB to prevent real connection attempts
process.env.PGHOST = 'localhost';
process.env.PGPORT = '5432';
process.env.PGUSER = 'test_user';
process.env.PGPASSWORD = 'test_password';
process.env.PGDATABASE = 'test_db';

// 1. Create pg-mem instance
const db = newDb();

// Add support for returning UUIDs (pg-mem doesn't have uuid-ossp out of the box)
db.public.registerFunction({
    name: 'uuid_generate_v4',
    returns: 'uuid',
    implementation: () => require('crypto').randomUUID(),
});

// Create the mock 'pg' adapter early
const { Pool } = db.adapters.createPg();

// Important: Mock the 'pg' module BEFORE any other files require it
jest.mock('pg', () => {
    return {
        Pool: jest.fn(() => new Pool())
    };
});

// Mock blockchain config to avoid real cryptographic operations
jest.mock('../config/blockchain', () => ({
    verifySignature: jest.fn((message, signature) => {
        // Simple mock: if signature equals wallet address, it passes
        return signature;
    }),
    getProvider: jest.fn(),
    getSigner: jest.fn(),
    getLandNFTContract: jest.fn(),
    getSaleContract: jest.fn(),
    getLandRegistryContract: jest.fn(),
}));

beforeAll(async () => {
    // 2. Load schema and strip unsupported extensions for pg-mem
    const schemaSql = fs.readFileSync(path.join(__dirname, '../config/schema.sql'), 'utf-8');

    // pg-mem doesn't support "CREATE EXTENSION" natively 
    const compatibleSchema = schemaSql.replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/ig, '');

    try {
        db.public.none(compatibleSchema);
        console.log("Memory DB initialized with schema.");
    } catch (err) {
        console.error("Error running schema in pg-mem:", err.message);
        throw err;
    }
});

afterAll(async () => {
    // Teardown if needed
});

// Setup generic mock reset
beforeEach(() => {
    jest.clearAllMocks();
});
