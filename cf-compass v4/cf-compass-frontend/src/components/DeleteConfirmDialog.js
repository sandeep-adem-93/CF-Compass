import React from 'react';
import './DeleteConfirmDialog.css';

function DeleteConfirmDialog({ patient, onConfirm, onCancel }) {
  return (
    <div className="delete-dialog-overlay">
      <div className="delete-dialog">
        <h3 className="delete-dialog-title">Delete Patient</h3>
        
        <div className="delete-dialog-content">
          <p>Are you sure you want to delete patient <strong>{patient.name}</strong>?</p>
          <p className="delete-warning">This action cannot be undone.</p>
        </div>
        
        <div className="delete-dialog-actions">
          <button 
            className="cancel-button" 
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            className="delete-button" 
            onClick={() => onConfirm(patient.id)}
          >
            Delete Patient
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmDialog;