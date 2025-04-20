import { Link } from 'react-router-dom';
import './PatientSidebar.css';
import React from 'react';

function PatientSidebar({ patients, currentPatient, onPatientSelect, onAddPatientClick, onPatientDelete, user }) {
  // generate initials for the avatar
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') {
      return 'NA';
    }
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Age calculation 
  const calculateAge = (patient) => {
    if (!patient || !patient.birthDate) {
      return 'Unknown';
    }
    
    const birthDate = new Date(patient.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleDeleteClick = (e, patient) => {
    e.stopPropagation(); // prevent triggering the patient selection
    onPatientDelete(patient);
  };

  return (
    <div className="patient-sidebar">
      <div className="sidebar-header">
        <Link to="/" className="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Dashboard
        </Link>
        {user && user.role === 'genetic_counselor' && (
          <button className="add-patient-button" onClick={onAddPatientClick}>
            + Add Patient
          </button>
        )}
      </div>
      
      <div className="patients-list">
        <h3 className="list-title">Patients</h3>
        
        {patients.map(patient => (
          <div 
            key={patient.id} 
            className={`patient-item ${currentPatient && patient.id === currentPatient.id ? 'active' : ''}`}
            onClick={() => onPatientSelect(patient)}
          >
            <div className="avatar">{getInitials(patient.name)}</div>
            <div className="patient-info">
              <div className="patient-name">{patient.name}</div>
              <div className="patient-details">
                {calculateAge(patient)} • {patient.gender}
              </div>
            </div>
            {user && user.role !== 'medical_receptionist' && (
              <button 
                className="delete-patient-button"
                onClick={(e) => handleDeleteClick(e, patient)}
                aria-label="Delete patient"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PatientSidebar;