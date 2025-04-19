import React from 'react';
import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="unauthorized-container">
      <div className="unauthorized-content">
        <h1>Access Denied</h1>
        <p>You don't have permission to access this page.</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="back-button"
        >
          Go Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Unauthorized; 