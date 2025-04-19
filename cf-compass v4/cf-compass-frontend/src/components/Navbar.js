import React from 'react';
import { Link } from 'react-router-dom';
import { logout, getCurrentUser, hasPermission } from '../services/authService';
import './Navbar.css';

function Navbar({ onAddPatientClick }) {
  const user = getCurrentUser();
  const canManagePatients = hasPermission('manage_patients');

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>
          <span className="logo-text">CF Compass</span>
        </Link>
        
        <div className="navbar-right">
          {user ? (
            <div className="user-info">
              <span className="username">{user.username}</span>
              <span className="user-role">({user.role})</span>
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="login-btn">
              Login
            </Link>
          )}
          {canManagePatients && (
            <button className="add-patient-btn" onClick={onAddPatientClick}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Patient
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;