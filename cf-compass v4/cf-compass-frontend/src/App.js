import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './services/authService';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import PatientDetails from './pages/PatientDetails';
import Unauthorized from './components/Unauthorized';
import Navbar from './components/Navbar';
import AddPatientModal from './components/AddPatientModal';
import './App.css';

function App() {
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = React.useState(false);
  const [patients, setPatients] = React.useState([]);

  const handleAddPatientClick = () => {
    setIsAddPatientModalOpen(true);
  };

  const handleCloseAddPatientModal = () => {
    setIsAddPatientModalOpen(false);
  };

  const fetchPatients = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/patients`);
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  React.useEffect(() => {
    fetchPatients();
  }, []);

  return (
    <Router>
      <div className="app">
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
                <Dashboard patients={patients} onPatientsUpdate={fetchPatients} />
              </ProtectedRoute>
            } />
            <Route path="/patient/:id" element={
              <ProtectedRoute>
                <PatientDetails onAddPatientClick={handleAddPatientClick} patients={patients} onPatientsUpdate={fetchPatients} />
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

        {isAddPatientModalOpen && (
          <AddPatientModal
            onClose={handleCloseAddPatientModal}
            onSuccess={fetchPatients}
          />
        )}
      </div>
    </Router>
  );
}

export default App;
