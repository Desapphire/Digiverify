require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    console.log('Resetting properties for Sepolia migration...\n');

    // Reset all properties back to pending, clear old Fuji NFT token IDs
    const res = await pool.query(
        `UPDATE properties 
         SET status = 'pending', nft_token_id = NULL 
         WHERE status = 'active' 
         RETURNING property_code, status, nft_token_id`
    );

    console.log(`Reset ${res.rowCount} properties back to pending:`);
    res.rows.forEach(r => {
        console.log(`  - ${r.property_code} → status: ${r.status}, nft_token_id: ${r.nft_token_id}`);
    });

    // Verify
    const check = await pool.query('SELECT property_code, status, nft_token_id FROM properties ORDER BY created_at');
    console.log('\nCurrent DB state:');
    console.table(check.rows);

    await pool.end();
    console.log('\nDone! Re-approve each property from the admin panel to mint fresh on Sepolia.');
})().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
