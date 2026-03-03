import api from './api';

export const authorityService = {
    // Property approvals
    approveProperty: (id, data) => api.put(`/authority/property/${id}/approve`, data), // { status, notes }
    setEncumbrance: (id, data) => api.put(`/authority/property/${id}/encumbrance`, data), // { hasEncumbrance, details }

    // Sale approvals
    approveSale: (id) => api.post(`/authority/sale/${id}/approve`),
    rejectSale: (id, data) => api.post(`/authority/sale/${id}/reject`, data),

    // Court Operations
    freezeProperty: (data) => api.post('/court/freeze', data), // { propertyId, reason, durationDays }
    reverseFreezeOrder: (freezeOrderId) => api.post(`/court/reverse/${freezeOrderId}`),
    forceTransfer: (data) => api.post('/court/force-transfer', data), // { propertyId, newOwnerAddress, reason }

    // Audit Logs
    getAuditLogs: (params) => api.get('/audit', { params }), // { action, entityType, limit }
};
