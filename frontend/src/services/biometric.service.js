import api from './api';

export const biometricService = {
    /**
     * 1:1 Face Verification using AWS Rekognition
     * @param {Object} params
     * @param {string} params.selfieImage - Base64 live selfie snapshot
     * @param {string} params.idDocumentImage - Base64 government ID document photo
     * @param {number} [params.similarityThreshold=80]
     */
    verifyFace: async ({ selfieImage, idDocumentImage, similarityThreshold = 80 }) => {
        const response = await api.post('/biometric/verify-face', {
            selfieImage,
            idDocumentImage,
            similarityThreshold,
        });
        return response.data;
    },

    /**
     * Liveness & Quality check for live camera stream frame
     * @param {string} image - Base64 video frame
     */
    livenessCheck: async (image) => {
        const response = await api.post('/biometric/liveness-check', { image });
        return response.data;
    },

    /**
     * Officer Biometric Citizen Identification & Deep Profile Fetch
     * @param {Object} params
     * @param {string} params.image - Base64 captured face frame
     * @param {number} [params.similarityThreshold=80]
     * @param {string} [params.simulatedMatchWallet]
     */
    identifyCitizen: async ({ image, similarityThreshold = 80, simulatedMatchWallet }) => {
        const response = await api.post('/biometric/identify-face', {
            image,
            similarityThreshold,
            simulatedMatchWallet,
        });
        return response.data;
    },
};

export default biometricService;
