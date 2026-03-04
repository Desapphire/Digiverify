/**
 * Database Reset Script — Truncates all tables.
 * USE WITH CAUTION.
 */

const { pool } = require('./config/db');

const tables = [
    'audit_logs',
    'wallet_recovery_requests',
    'fund_blocks',
    'multi_sig_approvals',
    'sale_transactions',
    'property_documents',
    'properties',
    'documents',
    'court_reversals',
    'court_freeze_orders',
    'users' // Truncate last because others reference it
];

const clearDatabase = async () => {
    console.log('⚠️ Starting database reset...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Disable triggers to avoid constraint issues during bulk truncate
        await client.query('SET CONSTRAINTS ALL DEFERRED');

        for (const table of tables) {
            console.log(`- Clearing ${table}...`);
            await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
        }

        await client.query('COMMIT');
        console.log('✅ Database cleared successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to clear database:', err.message);
    } finally {
        client.release();
        process.exit(0);
    }
};

clearDatabase();
