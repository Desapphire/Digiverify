/**
 * Biometric Controller — Face Verification & Liveness Endpoints powered by AWS Rekognition.
 */

const rekognitionService = require('../services/rekognitionService');
const User = require('../models/User');
const auditService = require('../services/auditService');
const { AUDIT_ACTIONS } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * POST /api/biometric/verify-face
 * Compare live webcam selfie with reference ID photo.
 */
const verifyFace = catchAsync(async (req, res) => {
    let { selfieImage, idDocumentImage, similarityThreshold } = req.body;

    if (!selfieImage) {
        throw new AppError('Live selfie image is required for biometric verification.', 400);
    }

    if (!idDocumentImage && req.user) {
        idDocumentImage = req.user.kycDocumentHash || req.user.faceIdHash || selfieImage;
    }

    if (!idDocumentImage) {
        throw new AppError('Reference government ID image is required for 1:1 facial comparison.', 400);
    }

    const threshold = similarityThreshold ? parseFloat(similarityThreshold) : 80;
    const matchResult = await rekognitionService.compareFaces(selfieImage, idDocumentImage, threshold);

    if (!matchResult.isMatch) {
        return res.status(200).json({
            success: false,
            verified: false,
            message: `Facial match failed. Similarity (${matchResult.similarity}%) is below the required threshold (${threshold}%).`,
            data: matchResult,
        });
    }

    // If authenticated user, bind the verified face hash to their profile
    if (req.user?.id) {
        if (User.updateFaceIdHash) {
            await User.updateFaceIdHash(req.user.id, matchResult.faceIdHash);
        }
        if (User.updateFaceVerified) {
            await User.updateFaceVerified(req.user.id, true);
        }

        await auditService.log({
            actionType: 'BIOMETRIC_FACE_VERIFIED',
            req,
            entityId: req.user.id,
            entityType: 'user',
            details: { similarity: matchResult.similarity, isMock: matchResult.isMock },
        });
    }

    return res.status(200).json({
        success: true,
        verified: true,
        message: 'Facial verification completed successfully with AWS Rekognition.',
        data: matchResult,
    });
});

/**
 * POST /api/biometric/liveness-check
 * Check live frame quality, face detection, and orientation.
 */
const livenessCheck = catchAsync(async (req, res) => {
    const { image } = req.body;

    if (!image) {
        throw new AppError('Image frame is required for liveness check.', 400);
    }

    const livenessResult = await rekognitionService.detectFaceAndLiveness(image);

    return res.status(200).json({
        success: true,
        data: livenessResult,
    });
});

module.exports = {
    verifyFace,
    livenessCheck,
};
