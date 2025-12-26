'use client';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setCredentials, logout } from '@/lib/features/auth/authSlice';
import axios from 'axios';

export default function AuthProvider({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data.success) {
            dispatch(setCredentials({ user: response.data.data.user, token }));
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          }
        } catch (err) {
          dispatch(logout());
        }
      }
    };

    checkAuth();
  }, [dispatch]);

  return children;
}

