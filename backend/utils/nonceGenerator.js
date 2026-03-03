const crypto = require('crypto');

/**
 * Generates a random 32‑byte hex string to be used as a nonce for wallet signing.
 * @returns {string} Hexadecimal nonce.
 */
function generateNonce() {
    return crypto.randomBytes(32).toString('hex');
}

module.exports = { generateNonce };
