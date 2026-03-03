/**
 * Blockchain configuration for Avalanche Fuji C-Chain.
 * Provides Ethers.js provider and signer instances.
 */

const ethers = require('ethers');
const env = require('./env');

let provider = null;
let signer = null;

/**
 * Get the JSON-RPC provider for Avalanche Fuji.
 * Lazily initialized, cached for reuse.
 */
const getProvider = () => {
    if (!provider) {
        provider = new ethers.JsonRpcProvider(env.BLOCKCHAIN.rpcUrl, {
            name: 'avalanche-fuji',
            chainId: env.BLOCKCHAIN.chainId,
        });
    }
    return provider;
};

/**
 * Get the server-side signer wallet.
 * Used for on-chain write operations (minting, transfers, etc.)
 */
const getSigner = () => {
    if (!signer) {
        if (!env.BLOCKCHAIN.signerKey) {
            console.warn('⚠️  SIGNER_PRIVATE_KEY not set — blockchain writes disabled');
            return null;
        }
        signer = new ethers.Wallet(env.BLOCKCHAIN.signerKey, getProvider());
    }
    return signer;
};

/**
 * Verify an Ethereum message signature.
 * @param {string} message - The original message that was signed.
 * @param {string} signature - The ECDSA signature.
 * @returns {string} Recovered wallet address (checksummed).
 */
const verifySignature = (message, signature) => {
    return ethers.verifyMessage(message, signature);
};

module.exports = {
    getProvider,
    getSigner,
    verifySignature,
    contractAddresses: env.BLOCKCHAIN.contracts,
};
