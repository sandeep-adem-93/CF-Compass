import React from 'react';
import './PatientTable.css';

function PatientTable({ patients, onPatientClick, onPatientDelete, user }) {
  // Function to generate initials for the avatar
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

  // Function to format variants for display
  const getVariants = (patient) => {
    if (!patient || !patient.variants || !Array.isArray(patient.variants)) {
      return 'No variants';
    }
    
    const variants = patient.variants;
    
    if (variants.length === 0) {
      return 'No variants';
    }
    
    if (variants.length === 1) {
      return variants[0];
    }
    
    if (variants.length === 2) {
      // If both variants are the same (homozygous)
      if (variants[0] === variants[1]) {
        return `${variants[0]} (Homozygous)`;
      }
      // If different variants (compound heterozygous)
      return `${variants[0]} / ${variants[1]}`;
    }
    
    // If more than 2 variants
    return `${variants[0]} + ${variants.length - 1} more`;
  };

  const calculateAge = (patient) => {
    if (!patient || !patient.birthDate) {
      return 'Unknown';
    }
    
    const birthDate = new Date(patient.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Adjust age if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleDeleteClick = (e, patient) => {
    e.stopPropagation(); // Prevent triggering the patient selection
    onPatientDelete(patient);
  };

  return (
    <div className="patient-table-container">
      <table className="patient-table">
        <thead>
          <tr>
            <th>NAME</th>
            <th>AGE</th>
            <th>GENDER</th>
            <th>VARIANTS</th>
            {user && user.role !== 'medical_receptionist' && <th>ACTIONS</th>}
          </tr>
        </thead>
        <tbody>
          {patients.length > 0 ? (
            patients.map((patient) => (
              <tr 
                key={patient.id} 
                onClick={() => onPatientClick(patient)}
                className="patient-row"
              >
                <td>
                  <div className="patient-name">
                    <div className="avatar">{getInitials(patient.name)}</div>
                    <span>{patient.name || 'Unknown'}</span>
                  </div>
                </td>
                <td>{calculateAge(patient)}</td>
                <td>{patient.gender || 'Unknown'}</td>
                <td>{getVariants(patient)}</td>
                {user && user.role !== 'medical_receptionist' && (
                  <td>
                    <button 
                      className="delete-patient-button1"
                      onClick={(e) => handleDeleteClick(e, patient)}
                      aria-label="Delete patient"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={user && user.role !== 'medical_receptionist' ? "5" : "4"} className="no-patients">
                No patients found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default PatientTable;