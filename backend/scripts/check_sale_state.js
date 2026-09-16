require('dotenv').config();
const { Pool } = require('pg');
const { ethers } = require('ethers');
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
        console.log("--- DATABASE STATE ---");
        const sale = await pool.query("SELECT * FROM sale_transactions WHERE id = '42cbf9f5-60fc-49d3-b5eb-92f2e938b376'");
        console.log("Sale:", sale.rows[0]);
        
        if (sale.rows[0]) {
            const property = await pool.query("SELECT * FROM properties WHERE id = $1", [sale.rows[0].property_id]);
            console.log("Property:", property.rows[0]);

            console.log("\n--- BLOCKCHAIN STATE ---");
            const { landNFT, saleContract } = getContracts();
            
            const tokenId = property.rows[0]?.nft_token_id;
            console.log("NFT Token ID:", tokenId);
            if (tokenId) {
                const ownerOnChain = await landNFT.ownerOf(tokenId);
                console.log(`Token ID ${tokenId} Owner On-Chain:`, ownerOnChain);
            }
            
            const onChainSaleId = sale.rows[0].on_chain_id;
            if (onChainSaleId) {
                const saleOnChain = await saleContract.sales(onChainSaleId);
                console.log(`Sale ID ${onChainSaleId} Status On-Chain:`, saleOnChain.status.toString());
            } else {
                console.log("on_chain_id is null on the sale record.");
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit(0);
    }
})();
