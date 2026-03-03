import api from './api';

export const authService = {
    // ── Auth & Onboarding ───────────────────────────────────
    register: (data) => api.post('/onboarding/register', data),
    loginWithPassword: (data) => api.post('/auth/login-password', data), // { email, password }
    getMe: () => api.get('/auth/me'),

    // Web3 / Wallet Authentication (if used)
    getNonce: (walletAddress) => api.get(`/auth/nonce/${walletAddress}`),
    verifySignature: (data) => api.post('/auth/verify', data),

    // ── User Profile & KYC ──────────────────────────────────
    getProfile: () => api.get('/users/profile'),
    bindFaceId: (faceIdHash) => api.put('/users/face-id', { faceIdHash }),
    submitKyc: (kycDocumentHash) => api.post('/users/kyc', { kycDocumentHash }),
    requestRecovery: (data) => api.post('/users/recovery/request', data) // { oldWallet, reason }
};
