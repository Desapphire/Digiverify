require('dotenv').config();
const { pool, connectDB } = require('./config/db');

async function fix() {
    try {
        await connectDB();
        console.log("Updating legacy users...");
        await pool.query(`UPDATE users SET role = 'user' WHERE role IN ('buyer', 'seller');`);

        console.log("Updating legacy multi sig approvals...");
        const tableExists = await pool.query(`SELECT to_regclass('public.multi_sig_approvals') as exists;`);
        if (tableExists.rows[0].exists) {
            await pool.query(`UPDATE multi_sig_approvals SET signer_role = 'user' WHERE signer_role IN ('buyer', 'seller');`);
        }

        // Ensure all user roles comply with new constraint
        await pool.query(`UPDATE users SET role = 'user' WHERE role NOT IN ('user','authority','court','bank_admin','super_admin');`);
        console.log("Dropping old constraint...");
        await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;`);

        console.log("Adding new constraint...");
        await pool.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user','authority','court','bank_admin','super_admin'));`);

        const msResult = await pool.query(`SELECT 1 FROM pg_constraint WHERE conname = 'multi_sig_approvals_signer_role_check'`);
        if (msResult.rows.length > 0) {
            console.log("Adding multi sig constraint...");
            await pool.query(`ALTER TABLE multi_sig_approvals DROP CONSTRAINT IF EXISTS multi_sig_approvals_signer_role_check;`);
            await pool.query(`ALTER TABLE multi_sig_approvals ADD CONSTRAINT multi_sig_approvals_signer_role_check CHECK (signer_role IN ('user','authority','court'));`);
        }

        console.log("Success");
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
fix();
