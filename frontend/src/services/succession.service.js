import api from './api';

export const successionService = {
    // File succession claim with heirs
    fileClaim: (data) => api.post('/succession/claims', data),

    // Get list of succession claims (filtered by user or all for admin)
    getClaims: () => api.get('/succession/claims'),

    // Get claim details by ID
    getClaimById: (id) => api.get(`/succession/claims/${id}`),

    // Revenue Officer approvals & executions
    approveClaim: (id, remarks) => api.put(`/succession/claims/${id}/approve`, { remarks }),
    executeClaim: (id) => api.put(`/succession/claims/${id}/execute`),
    rejectClaim: (id, remarks) => api.put(`/succession/claims/${id}/reject`, { remarks }),
};

export default successionService;
