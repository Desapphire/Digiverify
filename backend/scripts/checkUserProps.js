const { pool } = require('../config/db');

async function check() {
    const w = '0x0c7658f08e5fd105f1bdb471c8d35d4d2209f8a8'.toLowerCase();
    
    const u = await pool.query('SELECT id, name, email, wallet_address FROM users WHERE LOWER(wallet_address) = $1', [w]);
    console.log('User found:', u.rows);

    const p1 = await pool.query('SELECT id, property_code, survey_number, owner_wallet, status FROM properties WHERE LOWER(owner_wallet) = $1', [w]);
    console.log('Properties where owner_wallet = this wallet:', p1.rows);

    const p2 = await pool.query(`
        SELECT p.id, p.property_code, p.survey_number, p.owner_wallet, pco.share_percentage_bps, pco.ownership_type, pco.is_primary
        FROM property_co_owners pco
        JOIN properties p ON p.id = pco.property_id
        WHERE LOWER(pco.owner_wallet) = $1
    `, [w]);
    console.log('Properties where in property_co_owners:', p2.rows);

    process.exit(0);
}

check();
