import api from './api';

export const recoveryService = {
    // Request a wallet recovery
    requestRecovery: (data) => api.post('/users/recovery/request', data),

    // Get all user recovery requests
    getMyRecoveries: () => api.get('/users/recovery'),
};
