/**
 * Cryptographic utilities — nonce generation and government ID encryption.
 */

const crypto = require('crypto');
const env = require('../config/env');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Generate a cryptographically secure random nonce (hex string).
 * @param {number} [bytes=32] - Number of random bytes.
 * @returns {string} Hex-encoded nonce.
 */
const generateNonce = (bytes = 32) => {
    return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Encrypt a plaintext string (e.g. government ID).
 * @param {string} plaintext
 * @returns {string} iv:encrypted (hex-encoded).
 */
const encrypt = (plaintext) => {
    const key = crypto
        .createHash('sha256')
        .update(env.ENCRYPTION_KEY)
        .digest();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};

/**
 * Decrypt an encrypted string.
 * @param {string} encryptedText - Format: iv:ciphertext (hex).
 * @returns {string} Decrypted plaintext.
 */
const decrypt = (encryptedText) => {
    const key = crypto
        .createHash('sha256')
        .update(env.ENCRYPTION_KEY)
        .digest();
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

/**
 * Hash a value using SHA-256 (one-way, for audit comparisons).
 * @param {string} value
 * @returns {string} Hex-encoded hash.
 */
const hashSHA256 = (value) => {
    return crypto.createHash('sha256').update(value).digest('hex');
};

module.exports = { generateNonce, encrypt, decrypt, hashSHA256 };
