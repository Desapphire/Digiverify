/**
 * Contract Service — High-level blockchain operations for the full 8-contract GovTech suite.
 */

const { getContracts } = require('./contracts');
const { ethers } = require('ethers');

/**
 * ── 1. Property Registration Workflow (LandRegistry & LandNFT) ───────────────
 */

/**
 * Submit property registration to LandRegistry with full cadastral parameters.
 */
const registerPropertyOnChain = async (propertyCodeOrObj, surveyNumber, surveyDetails, district, state, areaSqft, coordinates, ownerAddress, documentHash, fairPrice) => {
    const { landRegistry } = getContracts();
    if (!landRegistry) return { txHash: null };

    let pCode, sNum, sDetails, dist, st, area, coords, owner, docHash, price;

    if (typeof propertyCodeOrObj === 'object' && propertyCodeOrObj !== null) {
        const p = propertyCodeOrObj;
        pCode = p.propertyCode || '';
        sNum = p.surveyNumber || 'SRV-001';
        sDetails = p.surveyDetails || '';
        dist = p.district || 'Registry District';
        st = p.state || 'Registry State';
        area = Math.floor(Number(p.areaSqft) || 0);
        coords = (p.geoLat && p.geoLng) ? `${p.geoLat}, ${p.geoLng}` : (p.coordinates || '');
        owner = p.ownerWallet || p.ownerAddress || '';
        docHash = p.documentHash || 'QmDefaultHash';
        price = Math.floor(Number(p.estimatedFairPrice) || 0);
    } else {
        pCode = propertyCodeOrObj || '';
        sNum = surveyNumber || 'SRV-001';
        sDetails = surveyDetails || '';
        dist = district || 'Registry District';
        st = state || 'Registry State';
        area = Math.floor(Number(areaSqft) || 0);
        coords = coordinates || '';
        owner = ownerAddress || '';
        docHash = documentHash || 'QmDefaultHash';
        price = Math.floor(Number(fairPrice) || 0);
    }

    try {
        // Check if property is already registered on-chain
        try {
            const onChainRecord = await landRegistry.propertyRecords(pCode);
            if (onChainRecord && onChainRecord.exists) {
                console.log(`Property ${pCode} already exists on-chain. Skipping initial registration step.`);
                return { txHash: null, alreadyRegistered: true };
            }
        } catch (checkErr) {
            // Non-blocking
        }

        const tx = await landRegistry.registerPropertyWithCadastral(
            pCode,
            sNum,
            sDetails,
            dist,
            st,
            area,
            coords,
            owner,
            docHash,
            price
        );
        const receipt = await tx.wait();
        return { txHash: receipt.hash };
    } catch (err) {
        console.error('Property registration on-chain failed:', err.message);
        throw err;
    }
};

/**
 * Approve property registration (mints LandNFT deed with metadata).
 */
const approvePropertyOnChain = async (propertyCode, metadataURI) => {
    const { landRegistry } = getContracts();
    if (!landRegistry) return { tokenId: null, txHash: null };

    try {
        const tx = await landRegistry.approveProperty(propertyCode || '', metadataURI || '');
        const receipt = await tx.wait();

        // Find PropertyApproved event to get tokenId
        const log = receipt.logs.find(x => x.fragment?.name === 'PropertyApproved');
        const tokenId = log?.args?.[1]?.toString();

        return { tokenId, txHash: receipt.hash };
    } catch (err) {
        console.error('Property approval on-chain failed:', err.message);
        throw err;
    }
};

/**
 * ── 2. Sale Workflow (Multi-sig Escrow with Bank Lien) ──────────────────────
 */

const registerOnChainSale = async (tokenId, propertyCode, seller, buyer, price, stampDuty, registrationFee) => {
    const { saleContract } = getContracts();
    if (!saleContract) return { txHash: null };

    try {
        let priceBigInt;
        if (typeof price === 'bigint') {
            priceBigInt = price;
        } else if (typeof price === 'number') {
            priceBigInt = BigInt(Math.floor(price));
        } else if (typeof price === 'string') {
            try {
                priceBigInt = ethers.parseUnits(price, 'ether');
            } catch {
                priceBigInt = BigInt(price);
            }
        } else {
            priceBigInt = 0n;
        }

        const dutyBigInt = (stampDuty !== undefined && stampDuty !== null)
            ? (typeof stampDuty === 'bigint' ? stampDuty : BigInt(Math.floor(Number(stampDuty))))
            : (priceBigInt * 56n) / 1000n; // 5.6%

        const feeBigInt = (registrationFee !== undefined && registrationFee !== null)
            ? (typeof registrationFee === 'bigint' ? registrationFee : BigInt(Math.floor(Number(registrationFee))))
            : (priceBigInt * 10n) / 1000n; // 1.0%

        console.log(`Calling initiateSaleWithRevenue on-chain for Token ${tokenId}, Price ${priceBigInt}...`);
        const tx = await saleContract.initiateSaleWithRevenue(
            tokenId,
            propertyCode,
            seller,
            buyer,
            priceBigInt,
            dutyBigInt,
            feeBigInt
        );
        const receipt = await tx.wait();

        const log = receipt.logs.find(x => x.fragment?.name === 'SaleInitiated');
        const saleId = log?.args?.[0]?.toString();

        return { saleId, txHash: receipt.hash };
    } catch (err) {
        console.error('Sale initiation on-chain failed:', err.message);
        throw err;
    }
};

const buyerSignOnChain = async (saleId) => {
    const { saleContract } = getContracts();
    const tx = await saleContract.buyerSign(saleId);
    return tx.wait();
};

const confirmFundsBlockedOnChain = async (saleId, bankRef, amount) => {
    const { saleContract } = getContracts();
    if (!saleContract) return { txHash: null };
    const ref = bankRef || 'ASBA-CONFIRMED';
    const amt = (amount !== undefined && amount !== null)
        ? (typeof amount === 'bigint' ? amount : BigInt(Math.floor(Number(amount))))
        : 0n;
    const tx = await saleContract.confirmFundsBlockedWithRef(saleId, ref, amt);
    return tx.wait();
};

const forceTransferNFT = async (fromAddress, toAddress, tokenId, reason) => {
    const { landNFT } = getContracts();
    const { getSigner } = require('../config/blockchain');
    const signer = getSigner();
    if (!landNFT || !signer) return { txHash: null };

    const tx = await landNFT.connect(signer).forceTransfer(
        fromAddress,
        toAddress,
        tokenId,
        reason || 'DigiVerify GovTech Title Transfer'
    );
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
};

const authorityApproveOnChain = async (saleId) => {
    const { saleContract } = getContracts();
    const tx = await saleContract.authorityApprove(saleId);
    return tx.wait();
};

const completeOnChainSale = async (saleId) => {
    const { saleContract } = getContracts();
    if (!saleContract) return { txHash: null };

    try {
        const tx = await saleContract.executeTransfer(saleId);
        const receipt = await tx.wait();
        return { txHash: receipt.hash };
    } catch (err) {
        console.error('On-chain sale completion failed:', err.message);
        throw err;
    }
};

const setEncumbranceOnChain = async (propertyCode, status, reason) => {
    const { landRegistry } = getContracts();
    if (!landRegistry) return { txHash: null };
    try {
        const tx = await landRegistry.setEncumbranceWithReason(propertyCode, status, reason || 'Authority Action');
        const receipt = await tx.wait();
        return { txHash: receipt.hash };
    } catch (err) {
        console.error('On-chain encumbrance failed:', err.message);
        throw err;
    }
};

/**
 * ── 3. Judicial Workflow (CourtOverride) ───────────────────────────────────
 */

const courtFreezeProperty = async (propertyId, reason, caseNumber, courtOrderHash, benchName) => {
    const { courtOverride } = getContracts();
    if (!courtOverride) return { txHash: null };
    const tx = await courtOverride.freezePropertyWithCourtOrder(
        propertyId,
        caseNumber || 'HC-ORDER',
        courtOrderHash || 'QmMockHash',
        benchName || 'High Court Division',
        reason
    );
    return tx.wait();
};

const courtReverseTransfer = async (propertyId, previousOwner, reason, caseNumber, courtOrderHash, benchName) => {
    const { courtOverride } = getContracts();
    if (!courtOverride) return { txHash: null };
    const tx = await courtOverride.reverseTransferWithCourtOrder(
        propertyId,
        previousOwner,
        caseNumber || 'HC-ORDER',
        courtOrderHash || 'QmMockHash',
        reason
    );
    return tx.wait();
};

const courtCancelSale = async (saleId, reason, caseNumber, courtOrderHash, benchName) => {
    const { courtOverride } = getContracts();
    if (!courtOverride) return { txHash: null };
    const tx = await courtOverride.cancelSaleWithCourtOrder(
        saleId,
        caseNumber || 'HC-ORDER',
        courtOrderHash || 'QmMockHash',
        reason
    );
    return tx.wait();
};

/**
 * ── 4. Bank Mortgage Lien Workflow (BankLienRegistry) ──────────────────────
 */

const createBankLienOnChain = async (tokenId, propertyCode, bankName, bankBranch, loanAccountNumber, sanctionedAmount, borrowerAddress, sanctionLetterHash) => {
    const { bankLienRegistry } = getContracts();
    if (!bankLienRegistry) return { lienId: null, txHash: null };

    try {
        const tx = await bankLienRegistry.createLien(
            tokenId,
            propertyCode,
            bankName,
            bankBranch,
            loanAccountNumber,
            sanctionedAmount,
            borrowerAddress,
            sanctionLetterHash
        );
        const receipt = await tx.wait();
        const log = receipt.logs.find(x => x.fragment?.name === 'LienCreated');
        const lienId = log?.args?.[0]?.toString();
        return { lienId, txHash: receipt.hash };
    } catch (err) {
        console.error('Bank lien creation failed:', err.message);
        throw err;
    }
};

const releaseBankLienOnChain = async (lienId, nocDocumentHash, remarks) => {
    const { bankLienRegistry } = getContracts();
    if (!bankLienRegistry) return { txHash: null };
    const tx = await bankLienRegistry.releaseLienWithNOC(lienId, nocDocumentHash, remarks || 'Loan fully settled');
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
};

/**
 * ── 5. Inheritance Succession Workflow (InheritanceSuccession) ─────────────
 */

const fileSuccessionClaimOnChain = async (tokenId, propertyCode, deceasedOwner, deathCertificateHash, probateOrderHash, courtBench, heirs) => {
    const { inheritanceSuccession } = getContracts();
    if (!inheritanceSuccession) return { caseId: null, txHash: null };

    const addresses = heirs.map(h => h.heirAddress);
    const names = heirs.map(h => h.fullName);
    const relations = heirs.map(h => h.relationToDeceased);
    const shareBps = heirs.map(h => h.sharePercentageBps);
    const kycHashes = heirs.map(h => h.kycHash || 'QmMockKyc');

    try {
        const tx = await inheritanceSuccession.fileSuccessionClaim(
            tokenId,
            propertyCode,
            deceasedOwner,
            deathCertificateHash,
            probateOrderHash || '',
            courtBench || 'Revenue Court',
            addresses,
            names,
            relations,
            shareBps,
            kycHashes
        );
        const receipt = await tx.wait();
        const log = receipt.logs.find(x => x.fragment?.name === 'SuccessionFiled');
        const caseId = log?.args?.[0]?.toString();
        return { caseId, txHash: receipt.hash };
    } catch (err) {
        console.error('Succession filing failed:', err.message);
        throw err;
    }
};

const approveSuccessionOnChain = async (caseId, remarks) => {
    const { inheritanceSuccession } = getContracts();
    if (!inheritanceSuccession) return { txHash: null };
    const tx = await inheritanceSuccession.approveSuccessionCase(caseId, remarks || 'Verified by Revenue Officer');
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
};

const executeSuccessionOnChain = async (caseId) => {
    const { inheritanceSuccession } = getContracts();
    if (!inheritanceSuccession) return { txHash: null };
    const tx = await inheritanceSuccession.executeSuccessionPartition(caseId);
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
};

/**
 * ── 6. Property Tax Workflow (PropertyTaxVault) ────────────────────────────
 */

const recordTaxAssessmentOnChain = async (tokenId, propertyCode, financialYear, baseTaxAmount, cessAmount, penaltyAmount) => {
    const { propertyTaxVault } = getContracts();
    if (!propertyTaxVault) return { assessmentId: null, txHash: null };

    try {
        const tx = await propertyTaxVault.recordAssessment(
            tokenId,
            propertyCode,
            financialYear,
            baseTaxAmount,
            cessAmount || 0,
            penaltyAmount || 0
        );
        const receipt = await tx.wait();
        const log = receipt.logs.find(x => x.fragment?.name === 'TaxAssessed');
        const assessmentId = log?.args?.[0]?.toString();
        return { assessmentId, txHash: receipt.hash };
    } catch (err) {
        console.error('Tax assessment recording failed:', err.message);
        throw err;
    }
};

const issueTaxClearanceNOCOnChain = async (tokenId, propertyCode, financialYear, validitySeconds, certificateHash) => {
    const { propertyTaxVault } = getContracts();
    if (!propertyTaxVault) return { txHash: null };
    const tx = await propertyTaxVault.issueTaxClearanceNOC(
        tokenId,
        propertyCode,
        financialYear,
        validitySeconds || 31536000,
        certificateHash
    );
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
};

/**
 * ── 7. Zero-Knowledge Citizen Identity KYC Workflow (CitizenIdentityRegistry)
 */

const attestCitizenIdentityOnChain = async (citizenWallet, identityHashBytes32, biometricMatchBytes32, kycLevel, validitySeconds, remarks) => {
    const { citizenIdentityRegistry } = getContracts();
    if (!citizenIdentityRegistry) return { txHash: null };

    try {
        const tx = await citizenIdentityRegistry.attestCitizenIdentity(
            citizenWallet,
            identityHashBytes32,
            biometricMatchBytes32 || ethers.ZeroHash,
            kycLevel || 3,
            validitySeconds || 31536000 * 3, // 3 years
            remarks || 'GovTech Attested'
        );
        const receipt = await tx.wait();
        return { txHash: receipt.hash };
    } catch (err) {
        console.error('Citizen identity attestation failed:', err.message);
        throw err;
    }
};

const isCitizenAttestedOnChain = async (citizenWallet) => {
    const { citizenIdentityRegistry } = getContracts();
    if (!citizenIdentityRegistry) return { isAttested: false, kycLevel: 0 };
    const [isAttested, kycLevel] = await citizenIdentityRegistry.isCitizenAttested(citizenWallet);
    return { isAttested, kycLevel: Number(kycLevel) };
};

module.exports = {
    // 1. Property Registration
    registerPropertyOnChain,
    approvePropertyOnChain,
    mintLandNFT: approvePropertyOnChain,
    setEncumbranceOnChain,

    // 2. Sale Escrow & Transfer
    registerOnChainSale,
    buyerSignOnChain,
    confirmFundsBlockedOnChain,
    authorityApproveOnChain,
    completeOnChainSale,
    forceTransferNFT,

    // 3. Judicial Orders
    courtFreezeProperty,
    courtReverseTransfer,
    courtCancelSale,

    // 4. Bank Liens
    createBankLienOnChain,
    releaseBankLienOnChain,

    // 5. Inheritance Succession
    fileSuccessionClaimOnChain,
    approveSuccessionOnChain,
    executeSuccessionOnChain,

    // 6. Property Tax Vault
    recordTaxAssessmentOnChain,
    issueTaxClearanceNOCOnChain,

    // 7. Identity Attestation
    attestCitizenIdentityOnChain,
    isCitizenAttestedOnChain
};
