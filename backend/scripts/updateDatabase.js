const { pool, connectDB } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runDatabaseUpdate() {
    console.log('🔄 Starting Database Schema Update & Synchronization...');
    try {
        // Read and execute schema.sql
        const schemaPath = path.join(__dirname, '../config/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
        
        console.log('Executing schema.sql...');
        await pool.query(schemaSql);
        console.log('✅ schema.sql executed successfully.');

        // Update properties_status_check constraint explicitly to ensure all statuses are supported
        await pool.query(`
            ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_status_check;
            ALTER TABLE properties ADD CONSTRAINT properties_status_check 
                CHECK (status IN ('pending', 'registered', 'active', 'frozen', 'under_dispute', 'rejected'));
        `);
        console.log('✅ properties_status_check constraint verified.');

        // Fetch list of all public tables
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);

        console.log('\n📊 Database Tables Status:');
        for (const row of tablesRes.rows) {
            const countRes = await pool.query(`SELECT COUNT(*)::int as count FROM "${row.table_name}"`);
            console.log(`  - ${row.table_name.padEnd(28)} : ${countRes.rows[0].count} records`);
        }

        console.log('\n✨ Database is fully updated, verified, and operational!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Database update error:', err);
        process.exit(1);
    }
}

runDatabaseUpdate();
