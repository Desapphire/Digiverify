require('dotenv').config();
const { Pool } = require('pg');
const contractService = require('../blockchain/contractService');

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
        const encumbered = await pool.query("SELECT property_code, encumbrance_reason FROM properties WHERE encumbrance_status = true");
        for (const prop of encumbered.rows) {
            console.log(`Pushing encumbrance to blockchain for ${prop.property_code}...`);
            await contractService.setEncumbranceOnChain(prop.property_code, true, prop.encumbrance_reason || "Authority Lock");
            console.log(`✅ Synced ${prop.property_code}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit(0);
    }
})();
