const { pool, connectDB } = require('./config/db');

async function fix() {
    try {
        await connectDB();
        console.log("Expanding multi_sig_approvals_signer_role_check constraint...");
        
        // 1. Drop existing constraint
        await pool.query(`ALTER TABLE multi_sig_approvals DROP CONSTRAINT IF EXISTS multi_sig_approvals_signer_role_check;`);
        
        // 2. Add new expanded constraint
        // Including 'user' and 'court' just in case fixDB.js logic is still assumed elsewhere, 
        // but 'buyer' and 'seller' are the critical ones for signSale.
        await pool.query(`
            ALTER TABLE multi_sig_approvals 
            ADD CONSTRAINT multi_sig_approvals_signer_role_check 
            CHECK (signer_role IN ('buyer', 'seller', 'user', 'authority', 'court'));
        `);
        
        console.log("✅ multi_sig_approvals constraint updated successfully.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Failed to update constraint:", err.message);
        process.exit(1);
    }
}

fix();
