import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = authService.getToken();
    const savedUser = authService.getCurrentUser();
    if (token && savedUser) {
      setUser(savedUser);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    const userData = { id: data.user.id, email: data.user.email };
    authService.setAuth(data.access_token, userData);
    setUser(userData);
    return data;
  };

  const register = async (email, password) => {
    const data = await authService.register(email, password);
    const userData = { id: data.user.id, email: data.user.email };
    authService.setAuth(data.access_token, userData);
    setUser(userData);
    return data;
  };

  const logout = () => {
    authService.clearAuth();
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
