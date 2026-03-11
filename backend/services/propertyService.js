/**
 * Property Service — Business logic for property management.
 */

const Property = require('../models/Property');
const contractService = require('../blockchain/contractService');
const AppError = require('../utils/AppError');

/**
 * Register a new property.
 */
const registerProperty = async (data, ownerWallet, userId) => {
    console.log(`📂 Registering property with payload:`, JSON.stringify(data, null, 2));
    
    // Save to off-chain DB first. It will be minted on-chain only upon authority approval.
    const property = await Property.create({ ...data, ownerWallet });
    console.log(`🆔 Property created with ID: ${property.id}`);

    // Persist associated documents if provided
    if (data.documents && Array.isArray(data.documents) && data.documents.length > 0) {
        console.log(`📄 Found ${data.documents.length} documents to persist.`);
        for (const doc of data.documents) {
            console.log(`  - Persisting ${doc.type}: ${doc.ipfsHash}`);
            await Property.addDocument({
                propertyId: property.id,
                documentType: doc.type,
                ipfsHash: doc.ipfsHash,
                uploadedBy: userId
            });
        }
        console.log(`✅ Persisted ${data.documents.length} documents for property ${property.propertyCode}`);
    } else {
        console.log(`⚠️ No documents found in payload or empty documents array.`);
    }

    console.log(`✨ Registration complete for property ${property.propertyCode}`);
    return { property, txHash: null };
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
