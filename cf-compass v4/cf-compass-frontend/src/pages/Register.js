import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Register.css';

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('genetic_counselor');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('=== Registration Attempt ===');
      console.log('Username:', username);
      console.log('Role:', role);
      
      const response = await axios.post('/api/auth/register', {
        username,
        password,
        role
      });

      console.log('Registration successful:', response.data);
      
      // Store token and user info
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h2>CF Compass Registration</h2>
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
            />
          </div>
          <div className="form-group">
            <label htmlFor="role">Role:</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="genetic_counselor">Genetic Counselor</option>
              <option value="medical_receptionist">Medical Receptionist</option>
            </select>
          </div>
          <button type="submit" className="register-button">Register</button>
        </form>
        <div className="login-link">
          Already have an account? <a href="/login">Login here</a>
        </div>
      </div>
    </div>
  );
}

export default Register; 