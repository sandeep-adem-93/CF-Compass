import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const API_URL = 'https://cf-compass.onrender.com';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Attempting login with:', { username });
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username,
        password
      });

      console.log('Login response:', response.data);

      // Store token and user info
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Update App component's state
      onLoginSuccess(response.data.user);

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.error || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>CF Compass Login</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter your username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>
          <button type="submit" className="login-button">Login</button>
        </form>
        <div className="register-link">
          Don't have an account? <Link to="/register">Register here</Link>
        </div>
      </div>
    </div>
  );
}

export default Login; 