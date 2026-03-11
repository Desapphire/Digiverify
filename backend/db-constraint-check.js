const { pool } = require('./config/db');

async function check() {
    try {
        console.log('--- Constraint Check: multi_sig_approvals ---');
        const res = await pool.query(`
            SELECT 
                conname, 
                pg_get_constraintdef(oid) as def
            FROM pg_constraint 
            WHERE conrelid = 'sale_transactions'::regclass;
        `);
        for (const row of res.rows) {
            console.log(`--- ${row.conname} ---`);
            console.log(row.def);
            console.log('');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
