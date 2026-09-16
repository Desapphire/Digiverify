import api from './api';

export const adminService = {
    // ── Dashboard Data ─────────────────────────────────────────
    listUsers: (kycStatus) => api.get('/admin/users', { params: { kycStatus } }),
    listProperties: (status) => api.get('/admin/properties', { params: { status } }),
    listSales: () => api.get('/admin/sales'),
    getPendingFundBlocks: () => api.get('/admin/fund-blocks/pending'),
    lookupWallet: (address) => api.get(`/admin/wallet/${address}`),
    getBlockchainHealth: () => api.get('/admin/blockchain-health'),

    // ── Admin & Authority Governance ───────────────────────────

    approveKyc: (userId, reason) => api.put(`/admin/kyc/${userId}/approve`, { reason }),
    rejectKyc: (userId, reason) => api.put(`/admin/kyc/${userId}/reject`, { reason }),
    requestReKyc: (userId, reason, requestedFields) => api.put(`/admin/kyc/${userId}/request-rekyc`, { reason, requestedFields }),

    // Property Setup
    approveProperty: (propertyId, reason) => api.put(`/admin/property/${propertyId}/approve`, { reason }),
    rejectProperty: (propertyId, reason) => api.put(`/admin/property/${propertyId}/reject`, { reason }),
    getPropertyDocuments: (propertyId) => api.get(`/properties/${propertyId}/documents`),
    setEncumbrance: (propertyId, encumbrance, reason = null) => api.put(`/admin/property/${propertyId}/encumbrance`, { encumbrance, reason }),

    // Court Actions
    freezeProperty: (propertyIdOrData, reason, courtOrderHash, caseNumber) => {
        if (typeof propertyIdOrData === 'object' && propertyIdOrData !== null) {
            return api.post('/admin/property/freeze', propertyIdOrData);
        }
        return api.post('/admin/property/freeze', { propertyId: propertyIdOrData, reason, courtOrderHash, caseNumber });
    },
    reverseFreezeOrder: (freezeOrderIdOrPropertyId, courtOrderHashOrData, reason) => {
        if (typeof courtOrderHashOrData === 'object' && courtOrderHashOrData !== null) {
            return api.post(`/admin/property/reverse-freeze/${freezeOrderIdOrPropertyId}`, courtOrderHashOrData);
        }
        return api.post(`/admin/property/reverse-freeze/${freezeOrderIdOrPropertyId}`, { courtOrderHash: courtOrderHashOrData, reason });
    },
    forceTransfer: (data) => api.post('/admin/property/force-transfer', data),

    // History and Logs
    getPropertyHistory: (propertyId) => api.get(`/admin/property/${propertyId}/history`),

    // Sales Execution
    approveSale: (saleId, reason) => api.post(`/admin/sale/${saleId}/approve`, { reason }),
    rejectSale: (saleId, reason) => api.post(`/admin/sale/${saleId}/reject`, { reason }),
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
    releaseFunds: (blockId) => api.put(`/admin/bank/fund-block/${blockId}/release`),

    // Court Document Upload — returns IPFS hash via existing /api/ipfs/upload
    uploadCourtDocument: (file) => {
        const form = new FormData();
        form.append('file', file);
        return api.post('/ipfs/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
};
