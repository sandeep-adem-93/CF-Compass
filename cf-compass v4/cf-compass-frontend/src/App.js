import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './services/authService';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Unauthorized from './components/Unauthorized';
import Navbar from './components/Navbar';
import AddPatientModal from './components/AddPatientModal';
import { uploadPatientData, getPatients } from './services/patientService';
import './App.css';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const data = await getPatients();
      setPatients(data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleAddPatientClick = () => {
    setIsModalOpen(true);
  };

  const handleAddPatient = async (patientData) => {
    try {
      console.log("App.js: handleAddPatient called with:", patientData ? "patient data present" : "no patient data");
      
      // Refresh the patient list after adding a new patient
      await fetchPatients();
      
      // Close the modal
      setIsModalOpen(false);
      return { success: true };
    } catch (error) {
      console.error('Error in handleAddPatient:', error);
      throw error;
    }
  };

  return (
    <Router>
      <div className="app-container">
        <Navbar onAddPatientClick={handleAddPatientClick} />
        
        <main className="app-content">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={
              isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Login />
            } />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />

            {/* Redirect root to dashboard if authenticated, otherwise to login */}
            <Route path="/" element={
              isAuthenticated() ? 
                <Navigate to="/dashboard" replace /> : 
                <Navigate to="/login" replace />
            } />
          </Routes>
        </main>
        
        {isModalOpen && (
          <AddPatientModal 
            onClose={() => setIsModalOpen(false)}
            onAddPatient={handleAddPatient}
          />
        )}
      </div>
    </Router>
  );
}

export default App;
