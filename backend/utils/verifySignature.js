const ethers = require('ethers');

/**
 * Verifies a signed message (nonce) and returns the recovered wallet address.
 * @param {string} message - The original nonce/message that was signed.
 * @param {string} signature - The signature string (hex).
 * @returns {string} Recovered wallet address.
 */
function verifySignature(message, signature) {
    try {
        return ethers.verifyMessage(message, signature);
    } catch (err) {
        console.error('Signature verification failed:', err);
        throw err;
    }
}

module.exports = { verifySignature };
