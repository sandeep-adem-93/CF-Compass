import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar({ onAddPatientClick }) {
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
          {/* <Link to="/" className="nav-link">Dashboard</Link> */}
          <button className="add-patient-btn" onClick={onAddPatientClick}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Patient
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;