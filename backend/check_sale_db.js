const { pool } = require('./config/db');

async function checkSale() {
    try {
        const result = await pool.query("SELECT * FROM sale_transactions WHERE id = 'c12d804c-9960-4ca4-b4bd-38529a91411e'");
        console.log(JSON.stringify(result.rows[0], null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkSale();
