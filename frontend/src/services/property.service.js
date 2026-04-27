import api from './api';

export const propertyService = {
    // ── Property Registration & Queries ────────────────────────────────────
    registerProperty: (data) => api.post('/properties', data),
    getMyProperties: () => api.get('/properties/my'),
    searchProperties: (query) => api.get('/properties/search', { params: { q: query } }),
    getPropertyById: (id) => api.get(`/properties/${id}`),
    getFreezeOrders: (id) => api.get(`/properties/${id}/freeze-orders`),
    uploadDocument: (id, documentHash) => api.post(`/properties/${id}/documents`, { documentHash }),
    getDocuments: (id) => api.get(`/properties/${id}/documents`),
    
    // ── IPFS ───────────────────────────────────────────────
    uploadToIPFS: (formData) => api.post('/ipfs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
};
