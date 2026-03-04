import api from './api';

export const adminService = {
    // ── Dashboard Data ─────────────────────────────────────────
    listUsers: (kycStatus) => api.get('/admin/users', { params: { kycStatus } }),
    listProperties: (status) => api.get('/admin/properties', { params: { status } }),
    listSales: () => api.get('/admin/sales'),
    getPendingFundBlocks: () => api.get('/admin/fund-blocks/pending'),
    lookupWallet: (address) => api.get(`/admin/wallet/${address}`),

    // ── Admin & Authority Governance ───────────────────────────

    // KYC
    approveKyc: (userId) => api.put(`/admin/kyc/${userId}/approve`),
    rejectKyc: (userId) => api.put(`/admin/kyc/${userId}/reject`),

    // Property Setup
    approveProperty: (propertyId) => api.put(`/admin/property/${propertyId}/approve`),
    setEncumbrance: (propertyId, description) => api.put(`/admin/property/${propertyId}/encumbrance`, { description }),

    // Court Actions
    freezeProperty: (propertyId, reason, courtOrderHash) => api.post('/admin/property/freeze', { propertyId, reason, courtOrderHash }),
    forceTransfer: (data) => api.post('/admin/property/force-transfer', data),

    // Sales Execution
    approveSale: (saleId) => api.post(`/admin/sale/${saleId}/approve`),
    rejectSale: (saleId) => api.post(`/admin/sale/${saleId}/reject`),
    completeSale: (saleId) => api.post(`/admin/sale/${saleId}/complete`),

    // Wallet Recovery
    getPendingRecoveries: () => api.get('/admin/recovery/pending'),
    verifyRecovery: (recoveryId) => api.put(`/admin/recovery/${recoveryId}/verify`),
    completeRecovery: (recoveryId, newWallet) => api.put(`/admin/recovery/${recoveryId}/complete`, { newWallet }),
    rejectRecovery: (recoveryId) => api.put(`/admin/recovery/${recoveryId}/reject`),

    // System Audit
    getAuditLogs: (params) => api.get('/admin/audit', { params }),

    // Bank Actions
    confirmFundBlock: (blockId, bankReferenceId) => api.put(`/admin/bank/fund-block/${blockId}/confirm`, { bankReferenceId }),
    releaseFunds: (blockId) => api.put(`/admin/bank/fund-block/${blockId}/release`)
};
