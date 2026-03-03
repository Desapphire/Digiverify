/**
 * One-time migration script.
 * Adds missing columns to existing tables before the schema runs.
 * Run: node migrate.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URI || process.env.DATABASE_URL;

const pool = new Pool(
    connectionString
        ? { connectionString }
        : {
            host: process.env.PGHOST,
            port: Number(process.env.PGPORT),
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD,
            database: process.env.PGDATABASE,
        }
);

const migrations = [
    // ── Users table ─────────────────────────────────────────
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42) UNIQUE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS government_id_hash VARCHAR(256)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_nonce VARCHAR(64)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'pending'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_document_hash VARCHAR(128)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS face_verified BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,

    // Make password nullable for wallet-only users
    `ALTER TABLE users ALTER COLUMN password DROP NOT NULL`,

    // Drop old role CHECK constraint and add new one with updated roles
    `DO $$ BEGIN
     ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
     ALTER TABLE users ADD CONSTRAINT users_role_check
       CHECK (role IN ('admin','verifier','owner','buyer','seller','authority','court','bank','bank_admin','super_admin'));
   END $$`,

    // ── Indexes ─────────────────────────────────────────────
    `CREATE INDEX IF NOT EXISTS idx_users_wallet ON users (wallet_address)`,
    `CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users (kyc_status)`,
    `CREATE INDEX IF NOT EXISTS idx_users_wallet_lower ON users (LOWER(wallet_address))`,
];

const run = async () => {
    console.log('🔄 Running migrations...\n');

    for (const sql of migrations) {
        try {
            await pool.query(sql);
            const label = sql.split('\n')[0].substring(0, 80);
            console.log(`  ✅ ${label}`);
        } catch (err) {
            const label = sql.split('\n')[0].substring(0, 80);
            console.log(`  ⚠️  ${label} — ${err.message}`);
        }
    }

    console.log('\n✅ Migrations complete. Now run: node server.js\n');
    await pool.end();
};

run();
