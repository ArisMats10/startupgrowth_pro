import React , { createContext, useState, useEffect } from 'react';
import {
  signup as signupApi,
  login as loginApi,
  getCurrentUser,
  logout as logoutApi,
  deleteAccount as deleteAccountApi,
    updateProfile as updateProfileApi,
    updatePassword as updatePasswordApi,
} from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const signup = async (data) => {
        const res = await signupApi(data);
        setUser(res.user);
        return res;
    }

    
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await getCurrentUser();
                setUser(user);
            } catch (error) {
                setUser(null);
            }finally {
                setLoading(false);
            }
        }
        fetchUser();
    }, []);

    const login = async (data) => {
        const res = await loginApi(data);
        setUser(res.user);
        return res;
    }

    const logout = async () => {
        await logoutApi();
        setUser(null);
    }

    const deleteAccount = async () => {
        await deleteAccountApi();
        setUser(null);
    }

    const refreshUser = async () => {
        const user = await getCurrentUser();
        setUser(user);
        return user;
    }

    const updateProfile = async (data) => {
        const res = await updateProfileApi(data);
        if (res?.user) setUser(res.user);
        return res;
    }

    const updatePassword = async (data) => {
        const res = await updatePasswordApi(data);
        return res;
    }

    return (
        <AuthContext.Provider value={{ user, loading, signup, login, logout, deleteAccount, refreshUser, updateProfile, updatePassword }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return React.useContext(AuthContext);
}