import api from './api';

export const taxService = {
    // List properties with their tax status
    getPropertiesWithTaxes: () => api.get('/tax/properties'),

    // Get tax details for a single property
    getPropertyTaxDetails: (propertyId) => api.get(`/tax/property/${propertyId}`),

    // Municipal Officer records assessment
    recordAssessment: (data) => api.post('/tax/assess', data),

    // Citizen pays tax dues and receives 1-year NOC
    payTax: (assessmentId, paymentMethod = 'CryptoVault') =>
        api.post(`/tax/${assessmentId}/pay`, { payment_method: paymentMethod }),

    // Fetch cryptographic NOC certificate
    getNOCById: (id) => api.get(`/tax/noc/${id}`),
};

export default taxService;
