const { getContracts } = require('./blockchain/contracts');
const { ethers } = require('ethers');

async function check() {
    try {
        const { saleContract } = getContracts();
        const saleId = 1; // From the logs
        const sale = await saleContract.sales(saleId);
        
        const statusMap = [
            'INITIATED', 
            'BUYER_SIGNED', 
            'FUNDS_BLOCKED', 
            'AUTHORITY_APPROVED', 
            'COMPLETED', 
            'CANCELLED', 
            'FROZEN'
        ];

        console.log('--- On-Chain Sale Status ---');
        console.log(`Sale ID: ${saleId}`);
        console.log(`Token ID: ${sale.tokenId}`);
        console.log(`Status: ${statusMap[sale.status]} (${sale.status})`);
        console.log(`Buyer Signed: ${sale.buyerSigned}`);
        console.log(`Funds Blocked: ${sale.fundsBlocked}`);
        console.log(`Authority Signed: ${sale.authoritySigned}`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Check failed:', err.message);
        process.exit(1);
    }
}

check();
