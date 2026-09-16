require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.PGHOST, port: process.env.PGPORT,
    user: process.env.PGUSER, password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE, ssl: { rejectUnauthorized: false }
});
(async () => {
    const r = await pool.query(
        `UPDATE properties SET status='active', nft_token_id='1'
         WHERE property_code='MA-2026-00001'
         RETURNING property_code, status, nft_token_id`
    );
    console.log('Synced MA-2026-00001:');
    console.table(r.rows);
    const all = await pool.query('SELECT property_code, status, nft_token_id FROM properties ORDER BY property_code');
    console.log('\nAll properties:');
    console.table(all.rows);
    await pool.end();
})();
