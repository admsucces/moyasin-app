import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import ApiService from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    const token = ApiService.getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    
    try {
      const res = await authService.getCurrentUser();
      if (res.success && res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
        ApiService.setAuthToken(null);
      }
    } catch (err) {
      setUser(null);
      ApiService.setAuthToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    if (res.success && res.data?.user) {
      setUser(res.data.user);
    }
    return res;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
