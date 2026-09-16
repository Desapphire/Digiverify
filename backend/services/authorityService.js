/**
 * Authority Service — Government authority actions.
 */

const Property = require('../models/Property');
const SaleTransaction = require('../models/SaleTransaction');
const saleService = require('./saleService');
const contractService = require('../blockchain/contractService');
const nftMetadataService = require('./nftMetadataService');
const { ethers } = require('ethers');
const AppError = require('../utils/AppError');

/**
 * Approve a property registration.
 */
const approveProperty = async (propertyId, reason = null) => {
    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found.', 404);

    if (property.status === 'active' && property.nftTokenId) {
        throw new AppError('Property is already active and minted on-chain.', 400);
    }

    // 1. Register Property on-chain if not already registered.
    //    This is idempotent — if already registered on-chain, it skips safely.
    console.log(`Registering property ${property.propertyCode} on-chain (authority approval) ...`);
    try {
        const regResult = await contractService.registerPropertyOnChain(property);
        if (regResult?.alreadyRegistered) {
            console.log(`Property ${property.propertyCode} was already on-chain — skipping registration, proceeding to approve.`);
        }
    } catch (regErr) {
        // If the contract reverts with "Property already registered", it means a previous
        // partial approval attempt already pushed it. We can safely continue to approveProperty.
        if (regErr.message && regErr.message.includes('Property already registered')) {
            console.log(`Property ${property.propertyCode} already registered on-chain (caught revert), proceeding to approve.`);
        } else {
            // Any other on-chain registration error is real — rethrow
            throw regErr;
        }
    }

    // 2. Generate and Pin ERC-721 Metadata and Deed Certificate to IPFS
    let metadataURI;
    try {
        metadataURI = await nftMetadataService.generateAndPinNFTMetadata(property);
    } catch (metaErr) {
        console.warn('Metadata generation failed, fallback to default:', metaErr.message);
        metadataURI = `https://gateway.pinata.cloud/ipfs/QmDefaultMetadata`;
    }

    // 3. Approve Property on-chain (mints LandNFT with IPFS metadata URI)
    let txHash = null;
    let tokenId = property.nftTokenId;

    try {
        const result = await contractService.approvePropertyOnChain(
            property.propertyCode,
            metadataURI
        );
        txHash = result.txHash;

        if (result.tokenId) {
            tokenId = result.tokenId;
            await Property.setNftTokenId(propertyId, result.tokenId);
            console.log(`NFT Minted for property ${propertyId}: TokenID ${result.tokenId}, Tx: ${txHash}, MetadataURI: ${metadataURI}`);
        }
    } catch (approveErr) {
        // If already approved on-chain (e.g. previous request timed out but tx went through),
        // read the existing tokenId from the on-chain record and continue to update DB.
        if (approveErr.message && approveErr.message.includes('Not in PENDING state')) {
            console.log(`Property ${property.propertyCode} already approved on-chain (recovered from timeout race). Reading token ID from chain...`);
            try {
                const { getContracts } = require('../blockchain/contracts');
                const { landRegistry } = getContracts();
                const onChainRecord = await landRegistry.propertyRecords(property.propertyCode);
                if (onChainRecord && onChainRecord.tokenId) {
                    tokenId = onChainRecord.tokenId.toString();
                    await Property.setNftTokenId(propertyId, tokenId);
                    console.log(`Recovered TokenID ${tokenId} for property ${property.propertyCode} from chain.`);
                }
            } catch (readErr) {
                console.warn('Could not read tokenId from chain after PENDING state error:', readErr.message);
            }
        } else {
            throw approveErr;
        }
    }

    // 4. Update status in DB
    const updatedProperty = await Property.updateStatus(propertyId, 'active', reason);
    if (tokenId) {
        updatedProperty.nftTokenId = tokenId;
    }

    return { property: updatedProperty, txHash };
};

/**
 * Reject a property registration.
 */
const rejectProperty = async (propertyId, reason = null) => {
    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found.', 404);

    if (property.status !== 'pending' && property.status !== 'registered') {
        throw new AppError('Only pending or registered properties can be rejected.', 400);
    }

    return Property.updateStatus(propertyId, 'rejected', reason);
};

/**
 * Approve a sale transaction (authority signature).
 */
const approveSaleTransaction = async (saleId, authorityWallet, signatureHash, reason = null) => {
    const sale = await SaleTransaction.findById(saleId);
    if (!sale) throw new AppError('Sale transaction not found.', 404);

    // 1. Progress on-chain state by Authority
    let txHash = null;
    if (sale.onChainId) {
        try {
            // Re-fetch sale to get latest status if needed
            // (Assuming sale.buyerSigned is true in DB since we are in approve flow)
            
            // Try to call buyerSign if not already done on-chain
            if (sale.buyerSigned) {
                try {
                    const { getContracts } = require('../blockchain/contracts');
                    const { saleContract } = getContracts();
                    const onChainData = await saleContract.sales(sale.onChainId);
                    if (onChainData.status === 0n || onChainData.status === 0) {
                        console.log(`Ensuring BuyerSign on-chain for SaleID: ${sale.onChainId}...`);
                        await contractService.buyerSignOnChain(sale.onChainId);
                    }
                } catch (e) {
                    console.log(`ℹ️ On-chain BuyerSign check: ${e.message}`);
                }
            }

            // Note: confirmFundsBlocked must have been called by Bank earlier.
            // If it failed on-chain, we can't easily fix it here without BANK_ROLE.
            
            console.log(`Executing AuthorityApprove on-chain for SaleID: ${sale.onChainId}...`);
            const result = await contractService.authorityApproveOnChain(sale.onChainId);
            txHash = result.hash;
            console.log(`On-chain sale approval successful for SaleID: ${sale.onChainId}, Tx: ${txHash}`);
        } catch (err) {
            // If it fails with "Funds must be blocked first", it means Bank confirmation is missing on-chain
            console.warn(`On-chain approval failed: ${err.message}`);
        }
    }

    // 2. Record approval in DB
    let finalSignatureHash = signatureHash;
    if (!finalSignatureHash) {
        try {
            const { getSigner } = require('../config/blockchain');
            const signer = getSigner();
            if (signer) {
                console.log(`Backend signing for Authority Approval (SaleID: ${saleId})...`);
                // Sign the saleId as proof of approval
                finalSignatureHash = await signer.signMessage(`Authority Approve Sale: ${saleId}`);
            }
        } catch (err) {
            console.warn('Backend signing failed:', err.message);
        }
    }

    const updatedSale = await saleService.approveSale(saleId, authorityWallet, finalSignatureHash, reason);
    return { sale: updatedSale, txHash };
};

/**
 * Reject a sale transaction.
 */
const rejectSaleTransaction = async (saleId, reason = null) => {
    const sale = await SaleTransaction.findById(saleId);
    if (!sale) throw new AppError('Sale transaction not found.', 404);
    saleService.validateTransition(sale.status, 'cancelled');
    return SaleTransaction.updateStatus(saleId, 'cancelled', reason);
};

/**
 * Set encumbrance on a property.
 */
const setEncumbrance = async (propertyId, flag, reason = null) => {
    const property = await Property.findById(propertyId);
    if (!property) throw new AppError('Property not found.', 404);
    
    const dbResult = await Property.setEncumbrance(propertyId, flag, reason);
    
    // Push encumbrance to blockchain if it's active on-chain
    if (property.status === 'active' || property.status === 'frozen') {
        try {
            await contractService.setEncumbranceOnChain(property.propertyCode, flag, reason);
            console.log(`Successfully synced encumbrance to blockchain for ${property.propertyCode}`);
        } catch (err) {
            console.error('Failed to sync encumbrance to blockchain:', err.message);
        }
    }
    
    return dbResult;
};

/**
 * Confirm funds are blocked (bank verification by authority).
 */
const confirmFundsBlocked = async (saleId) => {
    const sale = await SaleTransaction.findById(saleId);
    if (!sale) throw new AppError('Sale transaction not found.', 404);

    if (!sale.fundsBlocked) {
        throw new AppError('Funds are not yet blocked.', 400);
    }

    return sale;
};

module.exports = {
    approveProperty,
    approveSaleTransaction,
    rejectSaleTransaction,
    setEncumbrance,
    confirmFundsBlocked,
    rejectProperty,
};
