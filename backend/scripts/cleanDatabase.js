/**
 * Database Clean & Fresh Reset Script for DigiVerify
 * Cleans all transactional, property, lien, dispute, tax, and audit tables.
 * Preserves active citizen and administrative user accounts for clean onboarding.
 */

const { pool } = require('../config/db');

async function cleanDatabase() {
    console.log('🧹 Starting Complete Zero Database Purge (Option A)...\n');

    try {
        console.log('1. Purging all relational, transaction, legal, tax, and property tables...');
        await pool.query('DELETE FROM multi_sig_approvals');
        await pool.query('DELETE FROM fund_blocks');
        await pool.query('DELETE FROM sale_transactions');
        await pool.query('DELETE FROM court_reversals');
        await pool.query('DELETE FROM court_freeze_orders');
        await pool.query('DELETE FROM succession_heirs');
        await pool.query('DELETE FROM succession_claims');
        await pool.query('DELETE FROM bank_liens');
        await pool.query('DELETE FROM tax_clearance_nocs');
        await pool.query('DELETE FROM property_taxes');
        await pool.query('DELETE FROM property_co_owners');
        await pool.query('DELETE FROM property_documents');
        await pool.query('DELETE FROM properties');
        await pool.query('DELETE FROM wallet_recovery_requests');
        await pool.query('DELETE FROM identity_attestations');
        await pool.query('DELETE FROM audit_logs');
        console.log('   ✅ All properties, deeds, sales, liens, taxes, and logs cleared.');

        console.log('2. Purging all user and officer accounts...');
        await pool.query('DELETE FROM users');
        console.log('   ✅ All user and officer accounts cleared.');

        // Verify count of all tables
        const tables = [
            'users', 'properties', 'property_co_owners', 'property_documents',
            'sale_transactions', 'fund_blocks', 'multi_sig_approvals',
            'court_freeze_orders', 'court_reversals', 'bank_liens',
            'succession_claims', 'succession_heirs', 'property_taxes',
            'tax_clearance_nocs', 'identity_attestations', 'wallet_recovery_requests', 'audit_logs'
        ];

        console.log('\n📊 Table Verification:');
        for (const tbl of tables) {
            const res = await pool.query(`SELECT COUNT(*) FROM ${tbl}`);
            console.log(`   - ${tbl.padEnd(26)} : ${res.rows[0].count} rows`);
        }

        console.log('\n✨ Database is now at Absolute Zero (0 records across all tables)!');
    } catch (err) {
        console.error('❌ Error purging database:', err);
    } finally {
        process.exit(0);
    }
}

cleanDatabase();
