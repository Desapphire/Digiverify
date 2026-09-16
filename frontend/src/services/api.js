import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 300000, // 5 minutes request timeout for Sepolia block times
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Clean up empty objects or undefined values to avoid Zod issues
    if (config.data && typeof config.data === 'object') {
        Object.keys(config.data).forEach(key => {
            if (config.data[key] === undefined || config.data[key] === null) {
                delete config.data[key];
            }
        });
    }

    return config;
}, (error) => Promise.reject(error));

// Response Interceptor: Global Error Handling & Timeout/Rate-Limit Interception
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                window.location.href = '/login';
            }
        } else if (error.code === 'ECONNABORTED' || error.response?.status === 504 || (error.message && error.message.includes('timeout'))) {
            // Standardize timeout error message for UI consumption
            error.userMessage = 'The request timed out. The server or external verification service took too long to respond. Please try again.';
        } else if (error.response?.status === 429) {
            error.userMessage = error.response?.data?.message || 'Too many requests. Please slow down and try again shortly.';
        }

        return Promise.reject(error);
    }
);

export default api;
