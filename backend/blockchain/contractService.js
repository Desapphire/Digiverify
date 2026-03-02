/**
 * Contract Service — High-level blockchain operations.
 */

const { getContracts } = require('./contracts');

/**
 * Mint a Land NFT for a property.
 * @param {string} ownerAddress - Wallet address of the property owner.
 * @param {string} propertyCode - Unique property code.
 * @param {string} metadataURI - IPFS URI for property metadata.
 * @returns {object} { tokenId, txHash }
 */
const mintLandNFT = async (ownerAddress, propertyCode, metadataURI) => {
    const { landNFT } = getContracts();
    if (!landNFT) {
        console.warn('⚠️  LandNFT contract not configured — skipping mint');
        return { tokenId: null, txHash: null };
    }

    try {
        const tx = await landNFT.mintLand(ownerAddress, propertyCode, metadataURI);
        const receipt = await tx.wait();
        const event = receipt.logs?.find(l => l.fragment?.name === 'Transfer');
        const tokenId = event?.args?.[2]?.toString() || null;

        return { tokenId, txHash: receipt.hash };
    } catch (err) {
        console.error('❌ NFT mint failed:', err.message);
        throw err;
    }
};

/**
 * Transfer NFT ownership.
 * @param {string} from - Current owner wallet.
 * @param {string} to - New owner wallet.
 * @param {string} tokenId - NFT token ID.
 * @returns {object} { txHash }
 */
const transferNFT = async (from, to, tokenId) => {
    const { landNFT } = getContracts();
    if (!landNFT) {
        console.warn('⚠️  LandNFT contract not configured — skipping transfer');
        return { txHash: null };
    }

    try {
        const tx = await landNFT.transferFrom(from, to, tokenId);
        const receipt = await tx.wait();
        return { txHash: receipt.hash };
    } catch (err) {
        console.error('❌ NFT transfer failed:', err.message);
        throw err;
    }
};

/**
 * Force-transfer NFT (admin/court operation).
 * Requires the contract to have a forceTransfer function.
 */
const forceTransferNFT = async (tokenId, newOwner) => {
    const { landNFT } = getContracts();
    if (!landNFT) {
        console.warn('⚠️  LandNFT contract not configured — skipping force transfer');
        return { txHash: null };
    }

    try {
        const tx = await landNFT.forceTransfer(tokenId, newOwner);
        const receipt = await tx.wait();
        return { txHash: receipt.hash };
    } catch (err) {
        console.error('❌ NFT force transfer failed:', err.message);
        throw err;
    }
};

/**
 * Register a sale on-chain.
 */
const registerOnChainSale = async (propertyTokenId, seller, buyer, price) => {
    const { saleContract } = getContracts();
    if (!saleContract) {
        console.warn('⚠️  SaleContract not configured — skipping on-chain registration');
        return { txHash: null };
    }

    try {
        const tx = await saleContract.initiateSale(propertyTokenId, seller, buyer, price);
        const receipt = await tx.wait();
        return { txHash: receipt.hash };
    } catch (err) {
        console.error('❌ On-chain sale registration failed:', err.message);
        throw err;
    }
};

/**
 * Complete a sale on-chain.
 */
const completeOnChainSale = async (saleId) => {
    const { saleContract } = getContracts();
    if (!saleContract) {
        console.warn('⚠️  SaleContract not configured — skipping on-chain completion');
        return { txHash: null };
    }

    try {
        const tx = await saleContract.completeSale(saleId);
        const receipt = await tx.wait();
        return { txHash: receipt.hash };
    } catch (err) {
        console.error('❌ On-chain sale completion failed:', err.message);
        throw err;
    }
};

module.exports = {
    mintLandNFT,
    transferNFT,
    forceTransferNFT,
    registerOnChainSale,
    completeOnChainSale,
};
