/**
 * User Controller — Registration and profile management.
 */

const userService = require('../services/userService');
const User = require('../models/User');
const auditService = require('../services/auditService');
const { AUDIT_ACTIONS } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/users/notifications
 * Fetch user-centric audit logs as notifications.
 */
const getMyNotifications = catchAsync(async (req, res) => {
    const AuditLog = require('../models/AuditLog');

    // We want logs where the user is either the actor OR the target entity (e.g. KYC approval)
    // Or where the actor is null (system events) but related to this user ID.
    const { pool } = require('../config/db');
    const result = await pool.query(
        `SELECT * FROM audit_logs
         WHERE actor_user_id::text = $1::text
            OR (entity_type = 'user' AND entity_id::text = $1::text)
            OR (entity_type = 'property' AND entity_id::text IN (
                SELECT id::text FROM properties WHERE owner_wallet = (
                    SELECT wallet_address FROM users WHERE id::text = $1::text
                )
            ))
            OR (entity_type = 'sale_transaction' AND entity_id::text IN (
                SELECT id::text FROM sale_transactions
                WHERE buyer_wallet = (SELECT wallet_address FROM users WHERE id::text = $1::text)
                   OR seller_wallet = (SELECT wallet_address FROM users WHERE id::text = $1::text)
            ))
         ORDER BY created_at DESC LIMIT 50`,
        [req.user.id]
    );

    return res.status(200).json({
        success: true,
        data: result.rows,
    });
});

/**
 * POST /api/users/register
 */
const register = catchAsync(async (req, res) => {
    const user = await userService.register(req.body);

    // Mock req.user for audit since user just registered
    const mockReq = { ...req, user: { id: user.id, walletAddress: user.walletAddress } };
    await auditService.log({
        actionType: AUDIT_ACTIONS.USER_REGISTERED,
        req: mockReq,
        entityId: user.id,
        entityType: 'user',
    });

    return res.status(201).json({
        success: true,
        message: 'User registered successfully.',
        data: user,
    });
});

/**
 * POST /api/users/kyc
 * Submit KYC document hash.
 */
const submitKyc = catchAsync(async (req, res) => {
    const user = await userService.submitKyc(req.user.id, req.body.kycDocumentHash);

    await auditService.log({
        actionType: AUDIT_ACTIONS.KYC_SUBMITTED,
        req,
        entityId: req.user.id,
        entityType: 'user',
        metadata: { kycDocumentHash: req.body.kycDocumentHash },
    });

    return res.status(200).json({
        success: true,
        message: 'KYC documents submitted for review.',
        data: user,
    });
});

/**
 * PUT /api/users/:id/kyc/approve
 * Approve KYC (authority only).
 */
const approveKyc = catchAsync(async (req, res) => {
    const reason = req.body?.reason?.trim() || null;
    const user = await userService.approveKyc(req.params.id, reason);

    await auditService.log({
        actionType: AUDIT_ACTIONS.KYC_APPROVED,
        req,
        entityId: req.params.id,
        entityType: 'user',
        metadata: { reason },
    });

    return res.status(200).json({
        success: true,
        message: 'KYC approved.',
        data: user,
    });
});

/**
 * PUT /api/users/:id/kyc/reject
 * Reject KYC (authority only).
 */
const rejectKyc = catchAsync(async (req, res) => {
    const reason = req.body?.reason?.trim() || null;
    const user = await userService.rejectKyc(req.params.id, reason);

    await auditService.log({
        actionType: AUDIT_ACTIONS.KYC_REJECTED,
        req,
        entityId: req.params.id,
        entityType: 'user',
        metadata: { reason },
    });

    return res.status(200).json({
        success: true,
        message: 'KYC rejected.',
        data: user,
    });
});

/**
 * GET /api/users/profile
 */
const getProfile = catchAsync(async (req, res) => {
    const profile = await userService.getProfile(req.user.id);

    return res.status(200).json({
        success: true,
        message: 'Profile fetched.',
        data: profile,
    });
});

/**
 * PUT /api/users/profile
 * Update profile (email, phone).
 */
const updateProfile = catchAsync(async (req, res) => {
    const user = await userService.updateProfile(req.user.id, req.body);

    return res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data: user,
    });
});

/**
 * PUT /api/users/face-id
 * Bind Face ID hash.
 */
const bindFaceId = catchAsync(async (req, res) => {
    const user = await userService.bindFaceId(req.user.id, req.body.faceIdHash);

    return res.status(200).json({
        success: true,
        message: 'Face ID bound successfully.',
        data: user,
    });
});

/**
 * GET /api/admin/users
 * List users, optionally filtered by KYC status.
 */
const listUsers = catchAsync(async (req, res) => {
    const { kycStatus, limit = 50, offset = 0 } = req.query;
    let users;
    if (kycStatus) {
        users = await User.findByKycStatus(kycStatus);
    } else {
        users = await User.findAll(parseInt(limit), parseInt(offset));
    }

    // Strip sensitive fields
    const safeUsers = users.map(({ governmentIdHash, authNonce, ...u }) => u);

    return res.status(200).json({
        success: true,
        data: safeUsers,
    });
});

module.exports = { register, submitKyc, approveKyc, rejectKyc, getProfile, updateProfile, bindFaceId, listUsers, getMyNotifications };
