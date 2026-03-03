import api from './api';

export const authService = {
    getNonce: (walletAddress) => api.get(`/auth/nonce/${walletAddress}`),
    verifySignature: (data) => api.post('/auth/verify', data), // { walletAddress, signature }
    loginWithPassword: (data) => api.post('/auth/login-password', data), // { email, password }
    refreshToken: (data) => api.post('/auth/refresh', data), // { refreshToken }
    getMe: () => api.get('/auth/me'),

    // Phase 1 Registration
    registerLegal: (data) => api.post('/auth/register/legal', data),
    getRegisterNonce: (userId) => api.post('/auth/register/wallet/nonce', { userId }),
    verifyRegisterWallet: (data) => api.post('/auth/register/wallet/verify', data)
};

export const userService = {
    register: (data) => api.post('/users/register', data),
    getProfile: () => api.get('/users/profile'),
    submitKyc: (data) => api.post('/users/kyc', data),
    approveKyc: (id) => api.put(`/users/${id}/kyc/approve`),
    rejectKyc: (id) => api.put(`/users/${id}/kyc/reject`)
};
