import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

const getSafeStorageToken = () => {
    try {
        const t = localStorage.getItem('token');
        if (!t || t === 'undefined' || t === 'null') return null;
        return t;
    } catch {
        return null;
    }
};

const getSafeStorageUser = () => {
    try {
        const u = localStorage.getItem('user');
        if (!u || u === 'undefined' || u === 'null') return null;
        return JSON.parse(u);
    } catch {
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(getSafeStorageUser);
    const [token, setToken] = useState(getSafeStorageToken);
    const [loading, setLoading] = useState(true);

    const logout = () => {
        setToken(null);
        setUser(null);
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        } catch (_) {}
    };

    useEffect(() => {
        const initAuth = async () => {
            const currentToken = getSafeStorageToken();
            if (currentToken) {
                try {
                    const decoded = jwtDecode(currentToken);
                    if (decoded && decoded.exp && decoded.exp * 1000 < Date.now()) {
                        logout();
                    } else {
                        const savedUser = getSafeStorageUser();
                        if (savedUser) setUser(savedUser);

                        const res = await authService.getMe();
                        if (res.data && res.data.data) {
                            setUser(res.data.data);
                            localStorage.setItem('user', JSON.stringify(res.data.data));
                        }
                    }
                } catch (error) {
                    console.warn('Session verification error:', error);
                    logout();
                }
            } else {
                logout();
            }
            setLoading(false);
        };
        initAuth();
    }, []);

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

    return (
        <AuthContext.Provider value={{ user, token, loading, login, loginWithWallet, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
