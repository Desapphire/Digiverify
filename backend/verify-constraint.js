const { pool } = require('./config/db');

async function check() {
    try {
        const res = await pool.query("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'multi_sig_approvals_signer_role_check'");
        console.log("--- Current Constraint Definition ---");
        console.log(res.rows[0]?.pg_get_constraintdef || "NOT FOUND");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
