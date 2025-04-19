import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PatientDetails from './pages/PatientDetails';
import Navbar from './components/Navbar';
import AddPatientModal from './components/AddPatientModal';
import { uploadPatientData, getPatients } from './services/patientService';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }
  
  return isAuthenticated() ? children : <Navigate to="/login" />;
};

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
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar onAddPatientClick={handleAddPatientClick} />
          
          <main className="app-content">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route path="/patient/:id" element={<PatientDetails onAddPatientClick={handleAddPatientClick} patients={patients} onPatientsUpdate={fetchPatients} />} />
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
    </AuthProvider>
  );
}

export default App;
