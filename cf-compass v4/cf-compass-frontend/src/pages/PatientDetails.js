import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PatientSidebar from '../components/PatientSidebar';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import './PatientDetails.css';
import './PatientAnalysis.css'; // Import the new styles
import { getPatients, getPatientById, deletePatient } from '../services/patientService';


import GeneticVariants from '../components/GeneticVariants';
import '../components/GeneticVariants.css';


// Helper function to categorize clinical sections
const categorizeClinicalSection = (title) => {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('pulmonary') || lowerTitle.includes('lung') || lowerTitle.includes('respiratory')) {
    return 'pulmonary';
  } else if (lowerTitle.includes('pancreatic') || lowerTitle.includes('nutritional') || lowerTitle.includes('nutrition')) {
    return 'nutritional';
  } else if (lowerTitle.includes('therapy') || lowerTitle.includes('modulator') || lowerTitle.includes('treatment')) {
    return 'therapy';
  } else if (lowerTitle.includes('monitoring') || lowerTitle.includes('follow-up') || lowerTitle.includes('recommendations')) {
    return 'monitoring';
  }
  return '';
};

// Helper function to format patient analysis results
const formatPatientAnalysis = (patient) => {
  if (!patient) return { geneticAnalysis: null, clinicalSections: [] };
  
  // Extract genetic information
  let geneticAnalysis = '';
  let clinicalSections = [];
  
  // Check if the patient has genetic summary data
  if (patient.geneticSummary) {
    // Clean up the genetic analysis by removing any PART labels
    geneticAnalysis = patient.geneticSummary
      .replace(/PART\s*\d+\s*:?\s*/gi, '')
      .replace(/PART\s*\d+\s*/gi, '')
      .trim();
  }
  
  // Process clinical details
  if (patient.clinicalDetails && Array.isArray(patient.clinicalDetails)) {
    // Convert clinical details array to sections
    patient.clinicalDetails.forEach((detail, index) => {
      if (detail.text && detail.value) {
        clinicalSections.push({
          id: `section-${index + 1}`,
          title: detail.text,
          content: detail.value,
          category: categorizeClinicalSection(detail.text)
        });
      }
    });
  }
  
  return {
    geneticAnalysis,
    clinicalSections
  };
};

function PatientDetails({onAddPatientClick, patients, onPatientsUpdate, onLogout}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentPatient, setCurrentPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formattedAnalysis, setFormattedAnalysis] = useState({ geneticAnalysis: null, clinicalSections: [] });
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [user] = useState(JSON.parse(localStorage.getItem('user')));

  // Update current patient when patients array or ID changes
  useEffect(() => {
    if (id && patients.length > 0) {
      const patient = patients.find(p => p.id === id);
      if (patient) {
        console.log('Setting current patient:', patient);
        setCurrentPatient(patient);
        setError(null);
      } else {
        console.log('Patient not found, redirecting...');
        // If not found and we have other patients, redirect to the first one
        if (patients.length > 0) {
          navigate(`/patient/${patients[0].id}`);
        } else {
          navigate('/');
        }
      }
      setLoading(false);
    }
  }, [id, patients, navigate]);

  // Format analysis when current patient changes
  useEffect(() => {
    if (currentPatient) {
      console.log('Formatting analysis for patient:', currentPatient);
      const analysis = formatPatientAnalysis(currentPatient);
      setFormattedAnalysis(analysis);
    }
  }, [currentPatient]);

  const fetchPatientDetails = async (patientId) => {
    setLoading(true);
    try {
      // Find the patient in our already loaded patients
      const patient = patients.find(p => p.id === patientId);
      
      if (patient) {
        setCurrentPatient(patient);
        setError(null); // Clear any previous errors
      } else {
        // If not found and we have other patients, redirect to the first one
        if (patients.length > 0) {
          navigate(`/patient/${patients[0].id}`);
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      console.error(`Error fetching patient ${patientId}:`, err);
      // If we have other patients, redirect to the first one
      if (patients.length > 0) {
        navigate(`/patient/${patients[0].id}`);
      } else {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = (patient) => {
    navigate(`/patient/${patient.id}`);
  };

  // Calculate age from date of birth
  const calculateAge = (dob) => {
    if (!dob) return 'Unknown';
    
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Format date for display (YYYY-MM-DD)
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    
    try {
      // If the date is in YYYYMMDD format
      if (dateString.length === 8 && !dateString.includes('-')) {
        return `${dateString.substring(0, 4)}-${dateString.substring(4, 6)}-${dateString.substring(6, 8)}`;
      }
      
      // Otherwise, just return as is or try to format it
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      return date.toISOString().split('T')[0];
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return <div className="loading">Loading patient data...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!currentPatient) {
    return <div className="error-message">No patient data available</div>;
  }
  
  const { geneticAnalysis, clinicalSections } = formattedAnalysis;


  const handlePatientDelete = async (patientId) => {
    try {
      const token = localStorage.getItem('token');
      
      await deletePatient(patientId);
      setPatientToDelete(null); // Close the dialog
      
      // Refresh the patient list using the parent's update function
      await onPatientsUpdate();
      
      // If the deleted patient was the current one, navigate to another
      if (currentPatient && currentPatient.id === patientId) {
        // Get the updated patient list
        const updatedPatients = await getPatients();
        
        if (updatedPatients.length > 0) {
          // Find the next patient in the list
          const currentIndex = updatedPatients.findIndex(p => p.id === patientId);
          let nextPatient;
          
          if (currentIndex === -1 || currentIndex === updatedPatients.length - 1) {
            // If the deleted patient was the last one or not found, go to the first patient
            nextPatient = updatedPatients[0];
          } else {
            // Otherwise, go to the next patient in the list
            nextPatient = updatedPatients[currentIndex + 1];
          }
          
          if (nextPatient) {
            navigate(`/patient/${nextPatient.id}`);
          } else {
            navigate('/');
          }
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Error deleting patient:', error);
      setError(`Failed to delete patient: ${error.message}`);
    }
  };

  const handleLogout = () => {
    console.log('=== Logging Out ===');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
    navigate('/login');
  };

  return (
    <div className="patient-details-container">
      <PatientSidebar 
        patients={patients} 
        currentPatient={currentPatient}
        onPatientSelect={handlePatientSelect}
        onPatientDelete={(patient) => setPatientToDelete(patient)}
        onAddPatientClick={onAddPatientClick}
        user={user}
        onLogout={handleLogout}
      />
      
      <div className="patient-content">
        <header className="patient-header">
          <h1>{currentPatient.name}</h1>
          <div className="patient-id">ID: {currentPatient.id}</div>
        </header>
        
        <div className="patient-info-grid">
          {/* Patient Overview Card */}
          <div className="patient-card overview-card">
            <h2 className="card-title">Patient Overview</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Age</span>
                <span className="info-value">{calculateAge(currentPatient.birthDate)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Gender</span>
                <span className="info-value">{currentPatient.gender || 'Unknown'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Date of Birth</span>
                <span className="info-value">{formatDate(currentPatient.birthDate)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className={`status-badge ${currentPatient.status ? currentPatient.status.toLowerCase() : 'unknown'}`}>
                  {currentPatient.status || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Genetic Information Card */}
          {/* <div className="patient-card genetic-card">
            <h2 className="card-title">Genetic Information</h2>
             */}
            {/* Variant Tags */}
            {/* {currentPatient.variants && currentPatient.variants.length > 0 && (
              <div className="variant-tags">
                {currentPatient.variants.map((variant, index) => (
                  <span key={index} className="variant-tag">{variant}</span>
                ))}
              </div>
            )} */}
            
            {/* Genetic Summary */}
            {/* <div className="genetic-summary">
              {geneticAnalysis ? (
                <p>{geneticAnalysis}</p>
              ) : (
                <p className="no-data">No genetic analysis available.</p>
              )}
            </div>
          </div> */}
          {/* Genetic Information Card */}
          <div className="patient-card genetic-card">
            <h2 className="card-title">Genetic Information</h2>
            
            {/* Display the genetic variants */}
            <GeneticVariants 
              variants={currentPatient.variants} 
              expanded={true} 
            />
            
            {/* Genetic Summary */}
            <div className="genetic-summary">
              <h3 className="summary-title">Genetic Analysis</h3>
              {geneticAnalysis ? (
                <p>{geneticAnalysis}</p>
              ) : (
                <p className="no-data">No genetic analysis available.</p>
              )}
            </div>
          </div>

          

          {/* Clinical Assessment Section */}
          <div className="clinical-section">
            <h2 className="section-title">Clinical Assessment</h2>
            
            {clinicalSections.length > 0 ? (
              clinicalSections.map((section) => (
                <div 
                  key={section.id} 
                  className={`patient-card clinical-card ${section.category}`}
                >
                  <h3 className="clinical-card-title">{section.title}</h3>
                  <div className="clinical-content">
                    {/* Format paragraphs nicely */}
                    {section.content.split(/\n\n+/).map((paragraph, pIndex) => (
                      paragraph.trim() && (
                        <p key={pIndex} className="clinical-paragraph">
                          {paragraph.trim()}
                        </p>
                      )
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="patient-card clinical-card">
                <p className="no-data">No clinical assessment available.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {patientToDelete && (
        <DeleteConfirmDialog
          patient={patientToDelete}
          onConfirm={handlePatientDelete}
          onCancel={() => setPatientToDelete(null)}
        />
      )}
    </div>
  );
}

export default PatientDetails;