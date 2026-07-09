const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');

const TEMP_DIR = path.join(__dirname, '..', 'uploads', 'temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Saves a multer file to the temporary local disk cache.
 */
const saveTempFile = (file) => {
    const uuid = crypto.randomUUID();
    const tempId = `temp_${uuid}`;
    
    const binPath = path.join(TEMP_DIR, `${tempId}.bin`);
    const jsonPath = path.join(TEMP_DIR, `${tempId}.json`);
    
    fs.writeFileSync(binPath, file.buffer);
    fs.writeFileSync(jsonPath, JSON.stringify({
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
    }));
    
    return tempId;
};

/**
 * Retrieves temporary file buffer and metadata from local cache.
 */
const getTempFile = (tempId) => {
    const binPath = path.join(TEMP_DIR, `${tempId}.bin`);
    const jsonPath = path.join(TEMP_DIR, `${tempId}.json`);
    
    if (!fs.existsSync(binPath) || !fs.existsSync(jsonPath)) {
        return null;
    }
    
    const buffer = fs.readFileSync(binPath);
    const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    return {
        buffer,
        ...meta
    };
};

/**
 * Deletes a temporary file from local disk.
 */
const deleteTempFile = (tempId) => {
    const binPath = path.join(TEMP_DIR, `${tempId}.bin`);
    const jsonPath = path.join(TEMP_DIR, `${tempId}.json`);
    
    if (fs.existsSync(binPath)) {
        try { fs.unlinkSync(binPath); } catch (e) {}
    }
    if (fs.existsSync(jsonPath)) {
        try { fs.unlinkSync(jsonPath); } catch (e) {}
    }
};

/**
 * Checks if a string is a temporary hash pattern.
 */
const isTempHash = (hash) => {
    return typeof hash === 'string' && hash.startsWith('temp_');
};

/**
 * Unpins a CID from Pinata.
 */
const unpinFromPinata = async (ipfsHash) => {
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;
    if (!pinataApiKey || !pinataSecretApiKey) return;
    
    try {
        await axios.delete(`https://api.pinata.cloud/pinning/unpin/${ipfsHash}`, {
            headers: {
                pinata_api_key: pinataApiKey,
                pinata_secret_api_key: pinataSecretApiKey,
            }
        });
        console.log(`🗑️ Unpinned ${ipfsHash} from Pinata`);
    } catch (err) {
        console.error(`Failed to unpin ${ipfsHash} from Pinata:`, err.response?.data || err.message);
    }
};

/**
 * Uploads file buffer directly to Pinata IPFS (or mocks if keys are missing).
 */
const uploadToIPFS = async (buffer, originalname, mimetype) => {
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;
    
    if (pinataApiKey && pinataSecretApiKey) {
        const formData = new FormData();
        formData.append('file', buffer, {
            filename: originalname,
            contentType: mimetype,
        });
        
        const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
            headers: {
                ...formData.getHeaders(),
                pinata_api_key: pinataApiKey,
                pinata_secret_api_key: pinataSecretApiKey,
            },
        });
        return response.data.IpfsHash;
    } else {
        const hash = crypto.createHash('sha256').update(buffer.toString() + Date.now()).digest('hex');
        return `Qm${hash.substring(0, 44)}`;
    }
};

/**
 * Resolves a temporary hash by uploading its file to IPFS and cleaning up.
 */
const resolveTempHash = async (tempId, uploadedList = [], resolvedMap = {}) => {
    // If we already resolved this tempId in this call context, reuse the CID
    if (resolvedMap[tempId]) {
        return resolvedMap[tempId];
    }

    const tempFile = getTempFile(tempId);
    if (!tempFile) {
        throw new Error(`Temporary file not found or expired: ${tempId}`);
    }
    
    try {
        const ipfsHash = await uploadToIPFS(tempFile.buffer, tempFile.originalname, tempFile.mimetype);
        uploadedList.push(ipfsHash);
        resolvedMap[tempId] = ipfsHash;
        deleteTempFile(tempId);
        return ipfsHash;
    } catch (err) {
        deleteTempFile(tempId);
        throw err;
    }
};

/**
 * Recursively resolves all temporary hashes inside a JSON object or array.
 */
const resolveAllHashes = async (obj, uploadedList = [], resolvedMap = {}) => {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            if (isTempHash(obj[i])) {
                obj[i] = await resolveTempHash(obj[i], uploadedList, resolvedMap);
            } else if (typeof obj[i] === 'object') {
                await resolveAllHashes(obj[i], uploadedList, resolvedMap);
            }
        }
    } else {
        for (const key of Object.keys(obj)) {
            if (isTempHash(obj[key])) {
                obj[key] = await resolveTempHash(obj[key], uploadedList, resolvedMap);
            } else if (typeof obj[key] === 'object') {
                await resolveAllHashes(obj[key], uploadedList, resolvedMap);
            }
        }
    }
    return obj;
};

module.exports = {
    saveTempFile,
    getTempFile,
    deleteTempFile,
    isTempHash,
    unpinFromPinata,
    resolveTempHash,
    resolveAllHashes
};
