const { pool } = require('./backend/config/db');

async function checkUser() {
    try {
        const result = await pool.query("SELECT * FROM users WHERE email = 'notakshay@proton.me'");
        console.log(JSON.stringify(result.rows[0], null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkUser();
