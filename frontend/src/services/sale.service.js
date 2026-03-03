import api from './api';

export const saleService = {
    // ── Property Sales (ASBA Flow) ────────────────────────────────────
    initiateSale: (data) => api.post('/sales', data), // { propertyId, buyerWallet, salePrice }
    getMySales: () => api.get('/sales/my'),
    getSaleById: (id) => api.get(`/sales/${id}`),
    signSale: (id, signatureHash) => api.post(`/sales/${id}/sign`, { signatureHash }),
    cancelSale: (id) => api.post(`/sales/${id}/cancel`),
    getTransactionsByProperty: (propertyId) => api.get(`/sales/property/${propertyId}`),
    completeSale: (id) => api.post(`/sales/${id}/complete`),
};
