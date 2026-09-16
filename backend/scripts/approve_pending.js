require('dotenv').config();

const { Pool } = require('pg');
const authorityService = require('../services/authorityService');
const db = require('../config/db');

const pool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        console.log('Connecting to databases...');
        await db.connectDB();
        
        console.log('Fetching pending properties...');
        const pendingProps = await pool.query("SELECT id, property_code FROM properties WHERE status = 'pending' ORDER BY property_code");
        
        if (pendingProps.rowCount === 0) {
            console.log('No pending properties found.');
        } else {
            for (const prop of pendingProps.rows) {
                console.log(`\nApproving property ${prop.property_code} (ID: ${prop.id})...`);
                try {
                    const result = await authorityService.approveProperty(prop.id, 'Bulk approval script');
                    console.log(`✅ Approved ${prop.property_code}. TxHash: ${result.txHash}`);
                } catch (err) {
                    console.error(`❌ Failed to approve ${prop.property_code}:`, err.message);
                }
            }
        }
    } catch (err) {
        console.error('Script error:', err);
    } finally {
        await pool.end();
        console.log('Done.');
        process.exit(0);
    }
})();
