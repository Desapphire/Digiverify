require('dotenv').config();
const { pool } = require('./config/db');

(async () => {
    try {
        const res = await pool.query('SELECT role, COUNT(*) FROM users GROUP BY role');
        console.log('User roles and counts:');
        console.table(res.rows);
    } catch (err) {
        console.error('Error querying roles:', err);
    } finally {
        await pool.end();
    }
})();
