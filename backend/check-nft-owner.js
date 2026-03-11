const { getContracts } = require('./blockchain/contracts');

async function check() {
    try {
        const { landNFT } = getContracts();
        const tokenId = 1;
        const owner = await landNFT.ownerOf(tokenId);
        console.log(`NFT Token ID: ${tokenId}`);
        console.log(`Current Owner: ${owner}`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Check failed:', err.message);
        process.exit(1);
    }
}

check();
