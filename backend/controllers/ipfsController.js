const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const tempStorage = require('../utils/tempStorage');

/**
 * Uploads a file to temporary cache.
 */
const uploadToIPFS = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new AppError('No file provided', 400);
    }

    // Save locally to temp storage and generate a temporary token ID
    const tempId = tempStorage.saveTempFile(req.file);

    return res.status(200).json({
        success: true,
        data: {
            ipfsHash: tempId,
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
        }
    });
});

module.exports = {
    uploadToIPFS,
};
