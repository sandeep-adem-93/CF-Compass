import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import PatientDetails from './pages/PatientDetails';
import Navbar from './components/Navbar';
import AddPatientModal from './components/AddPatientModal';
import Login from './pages/Login';
import Register from './pages/Register';
import { uploadPatientData, getPatients } from './services/patientService';
import './App.css';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    // Only fetch patients if we have a token
    if (token) {
      fetchPatients();
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  };

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
  };

  const fetchPatients = async () => {
    try {
      console.log('Fetching patients with token:', token ? `${token.substring(0, 5)}...` : 'none');
      const data = await getPatients(token);
      setPatients(data);
    } catch (error) {
      console.error('Error fetching patients:', error);
      if (error.response?.status === 401) {
        // Token expired or invalid
        handleLogout();
      }
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
        <Navbar 
          onAddPatientClick={handleAddPatientClick} 
          user={user}
          onLogout={handleLogout}
        />
        
        <main className="app-content">
          <Routes>
            <Route path="/login" element={<Login onLoginSuccess={handleLogin} />} />
            <Route path="/register" element={<Register onLoginSuccess={handleLogin} />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard patients={patients} onPatientsUpdate={fetchPatients} />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
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
  );
}

// Protected Route component
function ProtectedRoute({ children }) {
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default App;
