import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('scholartrack_token');
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
        setProfile(res.data.profile);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
      localStorage.removeItem('scholartrack_token');
      localStorage.removeItem('scholartrack_user');
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('scholartrack_token', res.data.token);
      localStorage.setItem('scholartrack_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      await fetchCurrentUser();
      return res.data.user;
    }
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.data.success) {
      localStorage.setItem('scholartrack_token', res.data.token);
      localStorage.setItem('scholartrack_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      await fetchCurrentUser();
      return res.data.user;
    }
  };

  const logout = () => {
    localStorage.removeItem('scholartrack_token');
    localStorage.removeItem('scholartrack_user');
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        register,
        logout,
        refreshProfile: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
