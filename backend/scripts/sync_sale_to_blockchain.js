require('dotenv').config();
const { Pool } = require('pg');
const { getContracts } = require('../blockchain/contracts');
const { getSigner } = require('../config/blockchain');

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
        const signer = getSigner();
        console.log(`Using signer ${signer.address}...`);

        // Find all completed sales where DB owner differs from on-chain owner
        const query = `
            SELECT s.id as sale_id, s.buyer_wallet, s.seller_wallet, s.property_id,
                   p.property_code, p.nft_token_id, p.owner_wallet
            FROM sale_transactions s
            JOIN properties p ON s.property_id = p.id
            WHERE s.status = 'completed'
        `;
        const res = await pool.query(query);

        for (const row of res.rows) {
            const tokenId = row.nft_token_id;
            if (!tokenId) continue;

            const onChainOwner = await landNFT.ownerOf(tokenId);
            console.log(`\nChecking Token ID ${tokenId} (${row.property_code}):`);
            console.log(`  DB Owner:       ${row.owner_wallet}`);
            console.log(`  On-Chain Owner: ${onChainOwner}`);

            if (onChainOwner.toLowerCase() !== row.buyer_wallet.toLowerCase()) {
                console.log(`  ⚡ Mismatch detected! Force transferring Token ${tokenId} from ${onChainOwner} to buyer ${row.buyer_wallet}...`);
                const tx = await landNFT.connect(signer).forceTransfer(
                    onChainOwner,
                    row.buyer_wallet,
                    tokenId,
                    `GovTech Title Deed Transfer for Sale ${row.sale_id}`
                );
                console.log(`  Tx submitted: ${tx.hash}`);
                console.log('  Waiting for confirmation on Sepolia...');
                const receipt = await tx.wait(1);
                console.log(`  ✅ Confirmed in block ${receipt.blockNumber}!`);

                await pool.query('UPDATE sale_transactions SET tx_hash = $1, updated_at = NOW() WHERE id = $2', [tx.hash, row.sale_id]);
                console.log(`  Updated sale ${row.sale_id} with tx_hash.`);
            } else {
                console.log(`  ✅ Already in sync.`);
            }
        }
    } catch (e) {
        console.error('Error during sync:', e);
    } finally {
        await pool.end();
        process.exit(0);
    }
})();
