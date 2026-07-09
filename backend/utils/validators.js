/**
 * Zod validation schemas for all API inputs.
 */

const { z } = require('zod');
const { ALL_ROLES } = require('../config/constants');

// ── Reusable primitives ─────────────────────────────────
const walletAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum wallet address');
const uuid = z.string().uuid('Invalid UUID');
const ipfsHash = z.string().min(10).max(128);

// ── Auth ─────────────────────────────────────────────────
const getNonceSchema = z.object({
    params: z.object({ walletAddress }),
});

const verifySignatureSchema = z.object({
    body: z.object({
        walletAddress,
        signature: z.string().min(130).max(132),
    }),
});

// ── User Registration ───────────────────────────────────
const registerUserSchema = z.object({
    body: z.object({
        walletAddress,
        name: z.string().min(2).max(128),
        email: z.string().email(),
        password: z.string().min(6),
        phone: z.string().min(7).max(20).optional(),
        governmentId: z.string().min(4).max(50).optional(),
        governmentIdType: z.enum(['Aadhar', 'Passport', 'Voter ID', 'Driving License']).optional(),
        houseNumber: z.string().max(256).optional(),
        locality: z.string().max(256).optional(),
        city: z.string().max(128).optional(),
        pinCode: z.string().max(20).optional(),
        state: z.string().max(128).optional(),
        country: z.string().max(128).optional(),
        birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
        role: z.enum(ALL_ROLES).optional(),
    }),
});

const updateKycSchema = z.object({
    body: z.object({
        kycDocumentHash: ipfsHash,
    }),
});

const bindFaceIdSchema = z.object({
    body: z.object({
        faceIdHash: z.string().min(32).max(128),
    }),
});

const updateProfileSchema = z.object({
    body: z.object({
        email: z.string().email().optional(),
        phone: z.string().min(7).max(20).optional(),
        houseNumber: z.string().max(256).optional(),
        locality: z.string().max(256).optional(),
        city: z.string().max(128).optional(),
        pinCode: z.string().max(20).optional(),
        state: z.string().max(128).optional(),
        country: z.string().max(128).optional(),
        walletAddress: walletAddress.optional(),
    }),
});


const loginPasswordSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(6),
    }),
});

// ── Property ────────────────────────────────────────────
const registerPropertySchema = z.object({
    body: z.object({
        surveyNumber: z.string().min(1).max(60),
        surveyDetails: z.string().optional(),
        geoLat: z.number().min(-90).max(90).optional(),
        geoLng: z.number().min(-180).max(180).optional(),
        areaSqft: z.number().positive().optional(),
        addressLine: z.string().max(512).optional(),
        district: z.string().max(128).optional(),
        state: z.string().max(128).optional(),
        documentHash: ipfsHash.optional(),
    }),
});

// ── Sale Transaction ────────────────────────────────────
const initiateSaleSchema = z.object({
    body: z.object({
        propertyId: uuid,
        buyerWallet: walletAddress,
        salePrice: z.number().positive(),
    }),
});

const signSaleSchema = z.object({
    body: z.object({
        signatureHash: z.string().min(130).max(132),
    }),
});

// ── Fund Block (Bank) ───────────────────────────────────
const requestFundBlockSchema = z.object({
    body: z.object({
        transactionId: uuid,
        blockAmount: z.number().positive(),
        currency: z.string().length(3).default('INR'),
    }),
});

const confirmFundBlockSchema = z.object({
    body: z.object({
        bankReferenceId: z.string().min(1).max(64),
    }),
});

// ── Court ───────────────────────────────────────────────
const freezePropertySchema = z.object({
    body: z.object({
        propertyId: uuid,
        courtOrderHash: ipfsHash,
        caseNumber: z.string().max(60).optional(),
        reason: z.string().optional(),
    }),
});

const reverseFreezeOrderSchema = z.object({
    body: z.object({
        courtOrderHash: ipfsHash,
        reason: z.string().optional(),
    }),
});

const forceTransferSchema = z.object({
    body: z.object({
        propertyId: uuid,
        newOwnerWallet: walletAddress,
        courtOrderHash: ipfsHash,
        reason: z.string().optional(),
    }),
});

// ── Wallet Recovery ─────────────────────────────────────
const requestRecoverySchema = z.object({
    body: z.object({
        oldWallet: walletAddress,
        reason: z.string().min(10),
    }),
});

const completeRecoverySchema = z.object({
    body: z.object({
        newWallet: walletAddress,
    }),
});

module.exports = {
    walletAddress,
    uuid,
    ipfsHash,
    getNonceSchema,
    verifySignatureSchema,
    registerUserSchema,
    updateKycSchema,
    updateProfileSchema,
    loginPasswordSchema,
    registerPropertySchema,
    initiateSaleSchema,
    signSaleSchema,
    requestFundBlockSchema,
    confirmFundBlockSchema,
    freezePropertySchema,
    reverseFreezeOrderSchema,
    forceTransferSchema,
    requestRecoverySchema,
    completeRecoverySchema,
    bindFaceIdSchema,
};
