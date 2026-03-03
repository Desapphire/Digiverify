/**
 * Application-wide constants and enums.
 * Single source of truth for all status values, roles, and state transitions.
 */

// ── User Roles ──────────────────────────────────────────
const ROLES = Object.freeze({
    USER: 'user', // Formerly buyer/seller
    AUTHORITY: 'authority',
    COURT: 'court',
    BANK_ADMIN: 'bank_admin',
    SUPER_ADMIN: 'super_admin',
});

const ALL_ROLES = Object.values(ROLES);

// ── KYC Statuses ────────────────────────────────────────
const KYC_STATUS = Object.freeze({
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected',
});

// ── Property Statuses ───────────────────────────────────
const PROPERTY_STATUS = Object.freeze({
    ACTIVE: 'active',
    FROZEN: 'frozen',
    UNDER_DISPUTE: 'under_dispute',
});

// ── Sale Transaction Statuses ───────────────────────────
const SALE_STATUS = Object.freeze({
    INITIATED: 'initiated',
    BUYER_SIGNED: 'buyer_signed',
    FUNDS_BLOCKED: 'funds_blocked',
    AUTHORITY_APPROVED: 'authority_approved',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    FROZEN: 'frozen',
});

// ── Sale State Machine — Valid Transitions ───────────────
// Maps current state → array of valid next states
const SALE_STATE_TRANSITIONS = Object.freeze({
    [SALE_STATUS.INITIATED]: [
        SALE_STATUS.BUYER_SIGNED,
        SALE_STATUS.CANCELLED,
        SALE_STATUS.EXPIRED,
        SALE_STATUS.FROZEN,
    ],
    [SALE_STATUS.BUYER_SIGNED]: [
        SALE_STATUS.FUNDS_BLOCKED,
        SALE_STATUS.CANCELLED,
        SALE_STATUS.EXPIRED,
        SALE_STATUS.FROZEN,
    ],
    [SALE_STATUS.FUNDS_BLOCKED]: [
        SALE_STATUS.AUTHORITY_APPROVED,
        SALE_STATUS.CANCELLED,
        SALE_STATUS.FROZEN,
    ],
    [SALE_STATUS.AUTHORITY_APPROVED]: [
        SALE_STATUS.COMPLETED,
        SALE_STATUS.CANCELLED,
        SALE_STATUS.FROZEN,
    ],
    [SALE_STATUS.COMPLETED]: [],       // Terminal state
    [SALE_STATUS.CANCELLED]: [],       // Terminal state
    [SALE_STATUS.EXPIRED]: [],         // Terminal state
    [SALE_STATUS.FROZEN]: [
        SALE_STATUS.INITIATED,           // Court can unfreeze → back to initiated
        SALE_STATUS.CANCELLED,
    ],
});

// ── Pre-conditions for completing a sale ─────────────────
const SALE_COMPLETION_REQUIREMENTS = Object.freeze({
    buyerSigned: true,
    sellerSigned: true,
    authoritySigned: true,
    fundsBlocked: true,
});

// ── Fund Block Statuses ─────────────────────────────────
const FUND_BLOCK_STATUS = Object.freeze({
    PENDING: 'pending',
    BLOCKED: 'blocked',
    RELEASED: 'released',
    FAILED: 'failed',
});

// ── Wallet Recovery Statuses ────────────────────────────
const RECOVERY_STATUS = Object.freeze({
    REQUESTED: 'requested',
    IDENTITY_VERIFIED: 'identity_verified',
    COMPLETED: 'completed',
    REJECTED: 'rejected',
});

// ── Audit Action Types ──────────────────────────────────
const AUDIT_ACTIONS = Object.freeze({
    // Auth
    USER_REGISTERED: 'USER_REGISTERED',
    USER_LOGIN: 'USER_LOGIN',
    NONCE_GENERATED: 'NONCE_GENERATED',

    // KYC
    KYC_SUBMITTED: 'KYC_SUBMITTED',
    KYC_APPROVED: 'KYC_APPROVED',
    KYC_REJECTED: 'KYC_REJECTED',

    // Property
    PROPERTY_REGISTERED: 'PROPERTY_REGISTERED',
    PROPERTY_APPROVED: 'PROPERTY_APPROVED',
    PROPERTY_UPDATED: 'PROPERTY_UPDATED',
    PROPERTY_FROZEN: 'PROPERTY_FROZEN',
    PROPERTY_UNFROZEN: 'PROPERTY_UNFROZEN',
    PROPERTY_DOCUMENT_UPLOADED: 'PROPERTY_DOCUMENT_UPLOADED',
    ENCUMBRANCE_SET: 'ENCUMBRANCE_SET',
    ENCUMBRANCE_CLEARED: 'ENCUMBRANCE_CLEARED',

    // Sale
    SALE_INITIATED: 'SALE_INITIATED',
    SALE_BUYER_SIGNED: 'SALE_BUYER_SIGNED',
    SALE_SELLER_SIGNED: 'SALE_SELLER_SIGNED',
    SALE_AUTHORITY_APPROVED: 'SALE_AUTHORITY_APPROVED',
    SALE_COMPLETED: 'SALE_COMPLETED',
    SALE_CANCELLED: 'SALE_CANCELLED',
    SALE_FROZEN: 'SALE_FROZEN',

    // Bank / ASBA
    FUND_BLOCK_REQUESTED: 'FUND_BLOCK_REQUESTED',
    FUND_BLOCK_CONFIRMED: 'FUND_BLOCK_CONFIRMED',
    FUND_UNBLOCKED: 'FUND_UNBLOCKED',

    // Court
    COURT_FREEZE_ISSUED: 'COURT_FREEZE_ISSUED',
    COURT_REVERSAL_ISSUED: 'COURT_REVERSAL_ISSUED',
    COURT_FORCE_TRANSFER: 'COURT_FORCE_TRANSFER',

    // Wallet Recovery
    WALLET_RECOVERY_REQUESTED: 'WALLET_RECOVERY_REQUESTED',
    WALLET_RECOVERY_VERIFIED: 'WALLET_RECOVERY_VERIFIED',
    WALLET_RECOVERY_COMPLETED: 'WALLET_RECOVERY_COMPLETED',
    WALLET_RECOVERY_REJECTED: 'WALLET_RECOVERY_REJECTED',

    // Ownership
    OWNERSHIP_TRANSFERRED: 'OWNERSHIP_TRANSFERRED',
    NFT_MINTED: 'NFT_MINTED',
    NFT_FORCE_TRANSFERRED: 'NFT_FORCE_TRANSFERRED',
});

// ── Nonce message template for wallet signing ────────────
const SIGN_MESSAGE_TEMPLATE = (nonce) =>
    `Sign this message to authenticate with Squrify Land Registry.\n\nNonce: ${nonce}\n\nThis request will not trigger a blockchain transaction or cost any gas fees.`;

module.exports = {
    ROLES,
    ALL_ROLES,
    KYC_STATUS,
    PROPERTY_STATUS,
    SALE_STATUS,
    SALE_STATE_TRANSITIONS,
    SALE_COMPLETION_REQUIREMENTS,
    FUND_BLOCK_STATUS,
    RECOVERY_STATUS,
    AUDIT_ACTIONS,
    SIGN_MESSAGE_TEMPLATE,
};
