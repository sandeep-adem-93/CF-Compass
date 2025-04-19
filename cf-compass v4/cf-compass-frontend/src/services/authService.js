import axios from 'axios';

// Use the full backend URL
const API_URL = process.env.REACT_APP_API_URL || 'https://cf-compass-backend.onrender.com';

// Login user
export const login = async (username, password) => {
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username,
      password
    });

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
  } catch (error) {
    throw error;
  }
};

// Register new user
export const register = async (username, password, role) => {
  try {
    const response = await axios.post(`${API_URL}/api/auth/register`, {
      username,
      password,
      role
    });

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
  } catch (error) {
    throw error;
  }
};

// Logout user
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.reload();
};

// Get current user
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    return JSON.parse(userStr);
  }
  return null;
};

// Get auth token
export const getToken = () => {
  return localStorage.getItem('token');
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getToken();
};

// Check if user has specific permission
export const hasPermission = (permission) => {
  const user = getCurrentUser();
  return user?.permissions?.includes(permission) || false;
};

// Check if user has specific role
export const hasRole = (role) => {
  const user = getCurrentUser();
  return user?.role === role;
}; 