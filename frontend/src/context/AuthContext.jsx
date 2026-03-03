import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initialize user from token or API if token exists
        const initAuth = async () => {
            if (token) {
                try {
                    const decoded = jwtDecode(token);
                    // Check if token is expired
                    if (decoded.exp * 1000 < Date.now()) {
                        logout();
                    } else {
                        // Optimistically set user from localStorage, then verify with API
                        const savedUser = localStorage.getItem('user');
                        if (savedUser) setUser(JSON.parse(savedUser));

                        const res = await authService.getMe();
                        if (res.data && res.data.data) {
                            setUser(res.data.data);
                            localStorage.setItem('user', JSON.stringify(res.data.data));
                        }
                    }
                } catch (error) {
                    logout();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, [token]);

    const login = async (email, password) => {
        const res = await authService.loginWithPassword({ email, password });
        const { accessToken, user: userData } = res.data.data;
        setToken(accessToken);
        setUser(userData);
        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(userData));
        return userData;
    };

    const loginWithWallet = async (walletAddress, signature) => {
        const res = await authService.verifySignature({ walletAddress, signature });
        const { accessToken, user: userData } = res.data.data;
        setToken(accessToken);
        setUser(userData);
        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(userData));
        return userData;
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, loginWithWallet, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
