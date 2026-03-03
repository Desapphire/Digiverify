/**
 * User Controller — Registration and profile management.
 */

const userService = require('../services/userService');
const auditService = require('../services/auditService');
const { AUDIT_ACTIONS } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');

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
    const user = await userService.approveKyc(req.params.id);

    await auditService.log({
        actionType: AUDIT_ACTIONS.KYC_APPROVED,
        req,
        entityId: req.params.id,
        entityType: 'user',
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
    const user = await userService.rejectKyc(req.params.id);

    await auditService.log({
        actionType: AUDIT_ACTIONS.KYC_REJECTED,
        req,
        entityId: req.params.id,
        entityType: 'user',
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

module.exports = { register, submitKyc, approveKyc, rejectKyc, getProfile, bindFaceId };
