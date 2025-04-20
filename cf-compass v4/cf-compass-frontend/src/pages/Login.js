import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login for user:', username);
      const response = await axios.post('https://cf-compass.onrender.com/api/auth/login', {
        username,
        password
      });

      console.log('Login response:', {
        status: response.status,
        hasToken: !!response.data.token,
        hasUser: !!response.data.user
      });

      if (response.data.token && response.data.user) {
        console.log('Login successful, storing token and user data');
        // Call the parent component's handler with both user data and token
        onLoginSuccess(response.data.user, response.data.token);
        navigate('/dashboard');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Error details:', error.response.data);
        setError(error.response.data.error || 'Login failed');
      } else {
        setError('Failed to connect to server');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Login</h1>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login; 