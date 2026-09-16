import api from './api';

export const riskService = {
    // Get AI/ML risk assessment for an active sale transaction
    getSaleRisk: async (saleId) => {
        const response = await api.get(`/risk/sale/${saleId}`);
        return response.data;
    },

    // Get fair market valuation and price deviation for a property
    getPropertyValuation: async (propertyId, proposedPrice = null) => {
        const url = proposedPrice
            ? `/risk/property/${propertyId}?proposedPrice=${proposedPrice}`
            : `/risk/property/${propertyId}`;
        const response = await api.get(url);
        return response.data;
    },

    // Evaluate custom transaction parameters (for simulator / admin investigation)
    evaluateRisk: async (payload) => {
        const response = await api.post('/risk/evaluate', payload);
        return response.data;
    },
};
