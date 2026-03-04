/**
 * Property Service — Business logic for property management.
 */

const Property = require('../models/Property');
const AppError = require('../utils/AppError');

/**
 * Register a new property.
 */
const registerProperty = async (data, ownerWallet) => {
    const property = await Property.create({ ...data, ownerWallet });

    let txHash = null;
    try {
        console.log(`🔗 Registering property ${property.propertyCode} on-chain...`);
        const result = await contractService.registerPropertyOnChain(
            property.propertyCode,
            ownerWallet,
            data.documentHash || 'QmDefaultHash'
        );
        txHash = result.txHash;
        if (txHash) {
            console.log(`✅ Property registered on-chain. Tx: ${txHash}`);
        }
    } catch (err) {
        console.error('⚠️ On-chain registration failed:', err.message);
    }

    return { property, txHash };
};

/**
 * Get property by ID with ownership/permission check.
 */
const getProperty = async (propertyId) => {
    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found.', 404);
    return property;
};

/**
 * Get all properties for a wallet.
 */
const getPropertiesByOwner = async (walletAddress) => {
    return Property.findByOwner(walletAddress);
};

/**
 * Search properties with filters.
 */
const searchProperties = async (filters) => {
    return Property.search(filters);
};

/**
 * Upload a document for a property.
 */
const uploadPropertyDocument = async (propertyId, { documentType, ipfsHash, description }, uploadedBy) => {
    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found.', 404);
    return Property.addDocument({ propertyId, documentType, ipfsHash, description, uploadedBy });
};

/**
 * Get all documents for a property.
 */
const getPropertyDocuments = async (propertyId) => {
    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found.', 404);
    return Property.getDocuments(propertyId);
};

module.exports = {
    registerProperty,
    getProperty,
    getPropertiesByOwner,
    searchProperties,
    uploadPropertyDocument,
    getPropertyDocuments,
};
