const { pool } = require('./config/db');

async function migrate() {
    console.log('🔄 Starting robust wallet normalization...');
    
    try {
        // 1. Discover foreign keys referring to users(wallet_address)
        const fkQuery = await pool.query(`
            SELECT 
                conname, 
                conrelid::regclass as table_name,
                pg_get_constraintdef(oid) as def
            FROM pg_constraint 
            WHERE confrelid = 'users'::regclass
        `);
        
        const fks = fkQuery.rows;
        console.log(`🔍 Found ${fks.length} foreign keys to drop/recreate.`);

        await pool.query('BEGIN');

        // 2. Drop all discovered foreign keys
        for (const fk of fks) {
            console.log(`  🗑️  Dropping ${fk.conname} on ${fk.table_name}...`);
            await pool.query(`ALTER TABLE ${fk.table_name} DROP CONSTRAINT ${fk.conname}`);
        }

        // 3. Normalize everything
        console.log('  🪄 Normalizing wallets...');
        await pool.query('UPDATE users SET wallet_address = LOWER(wallet_address) WHERE wallet_address IS NOT NULL');
        await pool.query('UPDATE properties SET owner_wallet = LOWER(owner_wallet) WHERE owner_wallet IS NOT NULL');
        await pool.query('UPDATE sale_transactions SET buyer_wallet = LOWER(buyer_wallet), seller_wallet = LOWER(seller_wallet)');
        await pool.query('UPDATE multi_sig_approvals SET signer_wallet = LOWER(signer_wallet)');
        await pool.query('UPDATE fund_blocks SET buyer_wallet = LOWER(buyer_wallet)');
        // Extra: verify case-sensitivity in where clauses if any records were missed or partially updated previously
        
        // 4. Re-create all foreign keys
        for (const fk of fks) {
            console.log(`  🏗️  Re-creating ${fk.conname} on ${fk.table_name}...`);
            await pool.query(`ALTER TABLE ${fk.table_name} ADD CONSTRAINT ${fk.conname} ${fk.def}`);
        }

        await pool.query('COMMIT');
        console.log('🚀 Robust DB Wallet Normalization Complete.');
        process.exit(0);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('❌ Robust Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
