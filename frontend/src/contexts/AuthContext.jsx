import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const storedUser = () => {
        try { return JSON.parse(localStorage.getItem('ct_user')) || null; }
        catch { return null; }
    };

    const [user, setUser] = useState(storedUser);

    const saveSession = (token, userData) => {
        localStorage.setItem('ct_token', token);
        localStorage.setItem('ct_user', JSON.stringify(userData));
        setUser(userData);
    };

    const register = useCallback(async (username, email, password) => {
        const { data } = await api.post('/auth/register', { username, email, password });
        saveSession(data.access_token, { id: data.user_id, username: data.username, email });
        return data;
    }, []);

    const login = useCallback(async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        saveSession(data.access_token, { id: data.user_id, username: data.username, email });
        return data;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('ct_token');
        localStorage.removeItem('ct_user');
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
