require('dotenv').config();
const { pool } = require('../config/db');

async function updateSchema() {
    console.log('Applying database schema updates for admin reasoning...');
    
    try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_comments TEXT;');
        console.log('✅ Added admin_comments column to users table.');
        
        await pool.query('ALTER TABLE properties ADD COLUMN IF NOT EXISTS admin_comments TEXT;');
        console.log('✅ Added admin_comments column to properties table.');
        
        await pool.query('ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS admin_comments TEXT;');
        console.log('✅ Added admin_comments column to sale_transactions table.');
        
        console.log('🎉 Schema updates completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error updating database schema:', err);
        process.exit(1);
    }
}

updateSchema();
