const API_URL = (process.env.REACT_APP_API_URL || 'https://cf-compass-backend.onrender.com').replace(/\/+$/, '');

// Login user
export const login = async (username, password) => {
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username,
      password
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}; 