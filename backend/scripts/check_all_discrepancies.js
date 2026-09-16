require('dotenv').config();
const { Pool } = require('pg');
const { getContracts } = require('../blockchain/contracts');

const pool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const { landNFT } = getContracts();

        console.log("=== CHECKING ALL PROPERTIES WITH NFT TOKEN IDS ===");
        const props = await pool.query("SELECT id, property_code, owner_wallet, nft_token_id, status FROM properties ORDER BY nft_token_id ASC");
        
        for (const p of props.rows) {
            if (!p.nft_token_id) continue;
            let onChainOwner = 'ERROR';
            try {
                onChainOwner = await landNFT.ownerOf(p.nft_token_id);
            } catch (err) {
                onChainOwner = `Not minted / error: ${err.message}`;
            }

            const match = (p.owner_wallet && onChainOwner) ? (p.owner_wallet.toLowerCase() === onChainOwner.toLowerCase()) : false;
            console.log(`\nProperty: ${p.property_code} (Token ID: ${p.nft_token_id})`);
            console.log(`  DB Owner:       ${p.owner_wallet}`);
            console.log(`  On-Chain Owner: ${onChainOwner}`);
            console.log(`  Match:          ${match ? '✅ YES' : '❌ MISMATCH'}`);

            // Also check sales for this property
            const sales = await pool.query("SELECT id, status, on_chain_id, tx_hash, buyer_wallet, seller_wallet, created_at FROM sale_transactions WHERE property_id = $1", [p.id]);
            if (sales.rows.length > 0) {
                console.log(`  Sales (${sales.rows.length}):`);
                for (const s of sales.rows) {
                    console.log(`    Sale ${s.id} | Status: ${s.status} | OnChainID: ${s.on_chain_id} | TxHash: ${s.tx_hash}`);
                    console.log(`      Buyer:  ${s.buyer_wallet}`);
                    console.log(`      Seller: ${s.seller_wallet}`);
                }
            } else {
                console.log(`  Sales: None recorded`);
            }
        }
    } catch (e) {
        console.error("Diagnosis error:", e);
    } finally {
        await pool.end();
        process.exit(0);
    }
})();
