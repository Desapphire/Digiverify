const { pool } = require('./config/db');
const bcrypt = require('bcrypt');

async function resetPassword() {
    try {
        const email = 'ubuntu@u.com';
        const newPassword = 'ubuntu123';
        console.log(`Hasing new password for ${email}...`);
        const hash = await bcrypt.hash(newPassword, 10);

        const res = await pool.query(
            'UPDATE users SET password = $1 WHERE email = $2 RETURNING id',
            [hash, email]
        );

        if (res.rowCount > 0) {
            console.log('✅ Password successfully updated for user ID:', res.rows[0].id);
        } else {
            console.log('❌ User not found.');
        }
    } catch (err) {
        console.error('❌ Error updating password:', err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

resetPassword();
