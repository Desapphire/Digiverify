import api from './api';

export const walletService = {
    requestRecovery: (data) => api.post('/wallet-recovery/request', data), // { oldWalletAddress, newWalletAddress, identityDocument }
    getPendingRecoveries: () => api.get('/wallet-recovery/pending'),
    verifyIdentity: (id) => api.put(`/wallet-recovery/${id}/verify`),
    completeRecovery: (id, data) => api.put(`/wallet-recovery/${id}/complete`, data), // { signature }
    rejectRecovery: (id, data) => api.put(`/wallet-recovery/${id}/reject`, data), // { reason }
};
