import api from './api';

export const userService = {
    getProfile: () => api.get('/users/profile'),
    updateProfile: (data) => api.put('/users/profile', data),
    getNotifications: () => api.get('/users/notifications'),
};
