const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Uploads a file to IPFS via Pinata.
 * Falls back to a simulated hash if API keys are missing.
 */
const uploadToIPFS = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new AppError('No file provided', 400);
    }

    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;

    let ipfsHash;

    if (pinataApiKey && pinataSecretApiKey) {
        // Upload to Pinata via real IPFS
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        try {
            const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
                headers: {
                    ...formData.getHeaders(),
                    pinata_api_key: pinataApiKey,
                    pinata_secret_api_key: pinataSecretApiKey,
                },
            });
            ipfsHash = response.data.IpfsHash;
        } catch (error) {
            console.error('Pinata upload failed:', error.response?.data || error.message);
            throw new AppError('Failed to pin file to IPFS', 500);
        }
    } else {
        // Mock IPFS upload for demonstration purposes if missing keys
        console.warn('⚠️ No PINATA_API_KEY found, mocking IPFS upload hash.');
        // Generate a pseudo-realistic CID using sha256
        const hash = crypto.createHash('sha256').update(req.file.buffer.toString() + Date.now()).digest('hex');
        // Typical IPFS CID starts with Qm
        ipfsHash = `Qm${hash.substring(0, 44)}`;
    }

    return res.status(200).json({
        success: true,
        data: {
            ipfsHash,
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
        }
    });
});

module.exports = {
    uploadToIPFS,
};
