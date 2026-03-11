const { pool } = require('./config/db');

async function cleanup() {
    console.log('🧹 Cleaning up blockchain references in DB...');
    
    try {
        // 1. Clear approvals
        console.log('🗑️  Clearing multi-sig approvals...');
        await pool.query('DELETE FROM multi_sig_approvals');

        // 2. Reset properties
        const resProp = await pool.query(`
            UPDATE properties 
            SET nft_token_id = NULL, 
                status = 'pending',
                updated_at = NOW()
        `);
        console.log(`✅ Reset ${resProp.rowCount} properties to 'pending' status.`);

        // 3. Reset sales
        const resSale = await pool.query(`
            UPDATE sale_transactions 
            SET on_chain_id = NULL, 
                tx_hash = NULL,
                status = 'cancelled',
                buyer_signed = FALSE,
                seller_signed = FALSE,
                authority_signed = FALSE,
                funds_blocked = FALSE,
                updated_at = NOW()
        `);
        console.log(`✅ Cancelled/Reset ${resSale.rowCount} sale transactions.`);

        // 4. Clear fund blocks
        console.log('🗑️  Clearing fund blocks...');
        await pool.query('DELETE FROM fund_blocks');

        console.log('🚀 Cleanup complete. Please re-approve properties to mint new NFTs.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Cleanup failed:', err);
        process.exit(1);
    }
}

cleanup();
