const { pool } = require('./config/db');

async function migrate() {
    console.log('🔄 Normalizing all wallet addresses to lowercase in DB...');
    
    try {
        await pool.query('BEGIN');

        // 1. Users
        const resUser = await pool.query('UPDATE users SET wallet_address = LOWER(wallet_address) WHERE wallet_address IS NOT NULL');
        console.log(`✅ Normalized ${resUser.rowCount} user wallets.`);

        // 2. Properties
        const resProp = await pool.query('UPDATE properties SET owner_wallet = LOWER(owner_wallet) WHERE owner_wallet IS NOT NULL');
        console.log(`✅ Normalized ${resProp.rowCount} property owner wallets.`);

        // 3. Sale Transactions
        const resSale = await pool.query('UPDATE sale_transactions SET buyer_wallet = LOWER(buyer_wallet), seller_wallet = LOWER(seller_wallet)');
        console.log(`✅ Normalized ${resSale.rowCount} sale transaction wallets.`);

        // 4. Multi-sig Approvals
        const resAppr = await pool.query('UPDATE multi_sig_approvals SET signer_wallet = LOWER(signer_wallet)');
        console.log(`✅ Normalized ${resAppr.rowCount} multi-sig approvals.`);

        // 5. Fund Blocks
        const resFund = await pool.query('UPDATE fund_blocks SET buyer_wallet = LOWER(buyer_wallet)');
        console.log(`✅ Normalized ${resFund.rowCount} fund block wallets.`);

        await pool.query('COMMIT');
        console.log('🚀 DB Wallet Normalization Complete.');
        process.exit(0);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
