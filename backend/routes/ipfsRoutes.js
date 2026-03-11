const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadToIPFS } = require('../controllers/ipfsController');
const authenticate = require('../middlewares/authenticate');

// Use memory storage for direct upload to Pinata
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF and JPG files are allowed.'));
        }
    }
});

router.post('/upload', authenticate, upload.single('file'), uploadToIPFS);

module.exports = router;
