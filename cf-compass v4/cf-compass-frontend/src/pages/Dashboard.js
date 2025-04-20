import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PatientTable from '../components/PatientTable';
import VariantChart from '../components/VariantChart';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import { getPatients, deletePatient } from '../services/patientService';
import './Dashboard.css';

function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('=== Dashboard Component Mounted ===');
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    console.log('Stored user:', storedUser ? JSON.parse(storedUser) : 'none');
    
    if (!storedUser) {
      console.log('No user found, redirecting to login');
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    console.log('Setting user:', parsedUser);
    setUser(parsedUser);
    fetchPatients();
  }, [navigate]);

  const fetchPatients = async () => {
    try {
      console.log('=== Fetching Patients ===');
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('Using token:', token ? `${token.substring(0, 5)}...` : 'none');
      
      const data = await getPatients(token);
      console.log('=== Patient Data Analysis ===');
      console.log('Raw patient data received:', data);
      
      if (!data || !Array.isArray(data)) {
        console.warn('Invalid data received:', data);
        setPatients([]);
        return;
      }

      const validPatients = data.map(patient => {
        console.log('Processing patient:', {
          id: patient.id,
          name: patient.name,
          status: patient.status,
          variants: patient.variants?.length || 0
        });
        
        return {
          ...patient,
          name: patient.name || `Patient ${patient.id}`,
          variants: patient.variants || [],
          status: patient.status || 'Active'
        };
      });

      console.log('Processed patients:', validPatients.length);
      setPatients(validPatients);
    } catch (error) {
      console.error('Error fetching patients:', error);
      setError('Failed to load patients');
      if (error.response?.status === 401) {
        console.log('Token expired or invalid, redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

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
      fetchPatients();
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
        <h1>Patient Dashboard</h1>
        {user && (
          <div className="user-info">
            <span>Welcome, {user.username}</span>
            <span className="user-role">({user.role})</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        )}
      </header>

      <div className="stats-container">
        <div className="stat-card">
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