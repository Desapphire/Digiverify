const { Pool } = require('pg');
const { ethers } = require('ethers');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const contractService = require('../backend/blockchain/contractService');
const Property = require('../backend/models/Property');
const SaleTransaction = require('../backend/models/SaleTransaction');

const pool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE
});

async function sync() {
    const saleId = 'c12d804c-9960-4ca4-b4bd-38529a91411e';
    const propertyId = '7a6f75e3-2a36-4f55-9b0f-7478111223a4';

    console.log('🔄 Syncing property and sale to blockchain...');

    // 1. Get DB data
    const propRes = await pool.query('SELECT * FROM properties WHERE id = $1', [propertyId]);
    const property = propRes.rows[0];
    const saleRes = await pool.query('SELECT * FROM sale_transactions WHERE id = $1', [saleId]);
    const sale = saleRes.rows[0];

    // 2. Register Property on-chain
    console.log('🔗 Registering property on-chain...');
    const regRes = await contractService.registerPropertyOnChain(
        property.property_code,
        '0xf19384d7e862253b3454f4db200464390b296062', // Original owner (seller)
        'QmDefaultHash'
    );
    console.log('✅ Registered! Tx:', regRes.txHash);

    // 3. Approve Property on-chain (Mint NFT)
    console.log('🔗 Approving property (Minting NFT)...');
    const appRes = await contractService.approvePropertyOnChain(
        property.property_code,
        `https://digiverify.gov/api/properties/${propertyId}`
    );
    console.log('✅ Minted! TokenID:', appRes.tokenId, 'Tx:', appRes.txHash);

    // Save TokenID to DB
    await pool.query('UPDATE properties SET nft_token_id = $1 WHERE id = $2', [appRes.tokenId, propertyId]);

    // 4. Initiate Sale on-chain
    console.log('🔗 Initiating sale on-chain...');
    const saleInitiated = await contractService.registerOnChainSale(
        appRes.tokenId,
        property.property_code,
        sale.buyer_wallet,
        ethers.parseUnits(sale.sale_price.toString(), 'ether')
    );
    console.log('✅ Sale Initiated! OnChainID:', saleInitiated.saleId, 'Tx:', saleInitiated.txHash);

    // Save OnChainID to DB
    await pool.query('UPDATE sale_transactions SET on_chain_id = $1, tx_hash = $2 WHERE id = $3', [saleInitiated.saleId, saleInitiated.txHash, saleId]);

    // 5. Multi-sig approvals on-chain
    console.log('🔗 Signing on-chain as Buyer...');
    await contractService.buyerSignOnChain(saleInitiated.saleId);
    
    console.log('🔗 Confirming funds on-chain...');
    await contractService.confirmFundsBlockedOnChain(saleInitiated.saleId);

    console.log('🔗 Approving as Authority on-chain...');
    await contractService.authorityApproveOnChain(saleInitiated.saleId);

    // 6. Final Execution
    console.log('🔗 Executing final transfer on-chain...');
    const finalTx = await contractService.completeOnChainSale(saleInitiated.saleId);
    console.log('🏁 TRANSFERRED ON-CHAIN! Tx:', finalTx.txHash);

    await pool.end();
}

sync().catch(console.error);
