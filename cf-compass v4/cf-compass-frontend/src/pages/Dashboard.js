import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PatientTable from '../components/PatientTable';
import VariantChart from '../components/VariantChart';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import { getPatients, deletePatient } from '../services/patientService';
import './Dashboard.css';

function Dashboard({ patients, onPatientsUpdate, user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    onPatientsUpdate();
  }, [user, navigate, onPatientsUpdate]);

  const filteredPatients = patients.filter(patient => {
    if (!patient) return false;
    const name = patient.name || '';
    const id = patient.id || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           id.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handlePatientClick = (patient) => {
    console.log('Patient clicked:', patient.id);
    navigate(`/patient/${patient.id}`);
  };

  const handlePatientDelete = async (patientId) => {
    try {
      console.log('=== Deleting Patient ===');
      console.log('Patient ID:', patientId);
      const token = localStorage.getItem('token');
      console.log('Using token:', token ? `${token.substring(0, 5)}...` : 'none');
      
      await deletePatient(patientId, token);
      console.log('Patient deleted successfully');
      setPatientToDelete(null);
      
      // Refresh the patient list
      console.log('Refreshing patient list');
      onPatientsUpdate();
    } catch (error) {
      console.error('Error deleting patient:', error);
      setError(`Failed to delete patient: ${error.message}`);
      if (error.response?.status === 401) {
        console.log('Token expired or invalid, redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    }
  };

  const handleLogout = () => {
    console.log('=== Logging Out ===');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Calculate variant statistics for the chart
  const calculateVariantStats = () => {
    console.log('=== Calculating Variant Statistics ===');
    const variantCounts = {};
    
    patients.forEach(patient => {
      if (patient.variants) {
        patient.variants.forEach(variant => {
          if (variantCounts[variant]) {
            variantCounts[variant]++;
          } else {
            variantCounts[variant] = 1;
          }
        });
      }
    });
    
    // Convert to array format for chart
    const stats = Object.entries(variantCounts).map(([variant, count]) => ({
      name: variant,
      count
    }));
    
    console.log('Variant statistics:', stats);
    return stats;
  };

  if (loading) {
    console.log('Loading patient data...');
    return <div className="loading">Loading patient data...</div>;
  }

  if (error) {
    console.error('Error state:', error);
    return <div className="error-message">{error}</div>;
  }

  console.log('Rendering dashboard with', patients.length, 'patients');
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Welcome, {user.username}</h1>
      </header>

      <div className="stats-container">
        <div className="stat-card1">
          <h3>Total Patients</h3>
          <div className="stat-value">{patients.length}</div>
        </div>
        <div className="stat-card">
          <h3>Variant Combinations</h3>
          <div className="stat-value">{calculateVariantStats().length}</div>
        </div>
      </div>

      <div className="main-content">
        <div className="table-section">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <PatientTable 
            patients={filteredPatients} 
            onPatientClick={handlePatientClick} 
            onPatientDelete={(patient) => setPatientToDelete(patient)}
            user={user}
          />
        </div>
        
        <div className="chart-section">
          <VariantChart data={calculateVariantStats()} />
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

export default Dashboard;