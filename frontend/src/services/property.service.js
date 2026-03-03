import api from './api';

export const propertyService = {
    // Properties
    registerProperty: (data) => api.post('/properties', data),
    getMyProperties: () => api.get('/properties/my'),
    searchProperties: (params) => api.get('/properties/search', { params }), // { status, query, page, limit }
    getProperty: (id) => api.get(`/properties/${id}`),
    uploadDocument: (id, formData) => api.post(`/properties/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getDocuments: (id) => api.get(`/properties/${id}/documents`),

    // Sales
    initiateSale: (data) => api.post('/sales', data),
    getMySales: () => api.get('/sales/my'),
    getSale: (id) => api.get(`/sales/${id}`),
    signSale: (id, data) => api.post(`/sales/${id}/sign`, data),
    completeSale: (id) => api.post(`/sales/${id}/complete`),
    cancelSale: (id) => api.post(`/sales/${id}/cancel`),
};
