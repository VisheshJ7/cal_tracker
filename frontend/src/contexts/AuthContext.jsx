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
        saveSession(data.access_token, { 
            id: data.user_id, 
            username: data.username, 
            email, 
            calorieGoal: data.calorie_goal,
            onboardingCompleted: data.onboarding_completed 
        });
        return data;
    }, []);

    const login = useCallback(async (username, password) => {
        const { data } = await api.post('/auth/login', { username, password });
        saveSession(data.access_token, { 
            id: data.user_id, 
            username: data.username, 
            calorieGoal: data.calorie_goal,
            onboardingCompleted: data.onboarding_completed 
        });
        return data;
    }, []);

    const completeOnboarding = useCallback(async (onboardingData) => {
        const { data } = await api.post('/user/onboarding', onboardingData);
        const updated = { ...user, calorieGoal: data.calorie_goal, onboardingCompleted: true };
        localStorage.setItem('ct_user', JSON.stringify(updated));
        setUser(updated);
        return data;
    }, [user]);

    const updateSettings = useCallback(async (calorieGoal) => {
        const { data } = await api.put('/user/settings', { calorie_goal: calorieGoal });
        const updated = { ...user, calorieGoal: data.calorie_goal };
        localStorage.setItem('ct_user', JSON.stringify(updated));
        setUser(updated);
        return data;
    }, [user]);

    const logout = useCallback(() => {
        localStorage.removeItem('ct_token');
        localStorage.removeItem('ct_user');
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout, register, updateSettings, completeOnboarding }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
