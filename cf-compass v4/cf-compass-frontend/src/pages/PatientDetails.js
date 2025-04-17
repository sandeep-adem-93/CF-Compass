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
  
  // Check if the patient has summary data for genetic analysis
  if (patient.summary) {
    // Clean up the genetic analysis by removing any PART labels
    geneticAnalysis = patient.summary
      .replace(/PART\s*\d+\s*:?\s*/gi, '')
      .replace(/PART\s*\d+\s*/gi, '')
      .trim();
  }
  
  // Process clinical details
  if (patient.details) {
    // Remove any PART labels from clinical details
    let clinicalDetails = patient.details
      .replace(/PART\s*\d+\s*:?\s*/gi, '')
      .replace(/PART\s*\d+\s*/gi, '')
      .trim();
    
    // Try to identify numbered sections like "1. Pulmonary Management:"
    // Try to identify numbered sections like "1. Pulmonary Management:" or "4. Monitoring and Follow-up Recommendations"
// The change is to make the colon optional using (:)?
    const sectionRegex = /(\d+\.\s+[\w\s\/\-]+)(:)?/g;
    const sectionMatches = [...clinicalDetails.matchAll(sectionRegex)];
    
    if (sectionMatches.length > 0) {
      // Process sections that are clearly numbered
      for (let i = 0; i < sectionMatches.length; i++) {
        const currentMatch = sectionMatches[i];
        const nextMatch = sectionMatches[i + 1];
        
        const title = currentMatch[1].trim();
        const startIndex = currentMatch.index + currentMatch[0].length;
        const endIndex = nextMatch ? nextMatch.index : clinicalDetails.length;
        
        let content = clinicalDetails.substring(startIndex, endIndex).trim();
        const category = categorizeClinicalSection(title);
        
        clinicalSections.push({
          id: `section-${i + 1}`,
          title,
          content,
          category
        });
      }
    } else {
      // If no numbered sections found, try to split by double asterisks which might indicate headers
      const asteriskRegex = /\*\*([\w\s\/]+)\*\*/g;
      const asteriskMatches = [...clinicalDetails.matchAll(asteriskRegex)];
      
      if (asteriskMatches.length > 0) {
        for (let i = 0; i < asteriskMatches.length; i++) {
          const currentMatch = asteriskMatches[i];
          const nextMatch = asteriskMatches[i + 1];
          
          const title = currentMatch[1].trim();
          const startIndex = currentMatch.index + currentMatch[0].length;
          const endIndex = nextMatch ? nextMatch.index : clinicalDetails.length;
          
          let content = clinicalDetails.substring(startIndex, endIndex)
            .replace(/\*\*/g, '')
            .trim();
          
          const category = categorizeClinicalSection(title);
          
          clinicalSections.push({
            id: `section-${i + 1}`,
            title,
            content,
            category
          });
        }
      } else {
        // If no clear sections are found, try to create sections from paragraphs
        const paragraphs = clinicalDetails.split(/\n\n+/);
        
        if (paragraphs.length > 1) {
          // Create a clinical overview from the first paragraph
          clinicalSections.push({
            id: 'clinical-overview',
            title: 'Clinical Overview',
            content: paragraphs[0].trim(),
            category: 'overview'
          });
          
          // Create a detailed analysis from the rest
          if (paragraphs.length > 2) {
            clinicalSections.push({
              id: 'detailed-analysis',
              title: 'Detailed Analysis',
              content: paragraphs.slice(1).join('\n\n').trim(),
              category: 'analysis'
            });
          }
        } else {
          // If single paragraph, just create one section
          clinicalSections.push({
            id: 'clinical-assessment',
            title: 'Clinical Assessment',
            content: clinicalDetails,
            category: 'overview'
          });
        }
      }
    }
  }

  
  return {
    geneticAnalysis,
    clinicalSections
  };
};

function PatientDetails({onAddPatientClick, patients, onPatientsUpdate}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentPatient, setCurrentPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formattedAnalysis, setFormattedAnalysis] = useState({ geneticAnalysis: null, clinicalSections: [] });
  const [patientToDelete, setPatientToDelete] = useState(null);

  useEffect(() => {
    if (id && patients.length > 0) {
      fetchPatientDetails(id);
    }
  }, [id, patients]);

  // Format the patient analysis whenever the current patient changes
  useEffect(() => {
    if (currentPatient) {
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
      await deletePatient(patientId);
      setPatientToDelete(null); // Close the dialog
      
      // Refresh the patient list using the parent's update function
      await onPatientsUpdate();
      
      // If the deleted patient was the current one, navigate to another
      if (currentPatient && currentPatient.id === patientId) {
        if (patients.length > 0) {
          // Find the next patient in the list
          const currentIndex = patients.findIndex(p => p.id === patientId);
          let nextPatient;
          
          if (currentIndex === -1 || currentIndex === patients.length - 1) {
            // If the deleted patient was the last one or not found, go to the first patient
            nextPatient = patients[0];
          } else {
            // Otherwise, go to the next patient in the list
            nextPatient = patients[currentIndex];
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

  return (
    <div className="patient-details-container">
      <PatientSidebar 
        patients={patients} 
        currentPatient={currentPatient}
        onPatientSelect={handlePatientSelect}
        onPatientDelete={(patient) => setPatientToDelete(patient)}
        onAddPatientClick={onAddPatientClick}
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
                <span className="info-value">{calculateAge(currentPatient.dob)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Gender</span>
                <span className="info-value">{currentPatient.gender || 'Unknown'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Date of Birth</span>
                <span className="info-value">{formatDate(currentPatient.dob)}</span>
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