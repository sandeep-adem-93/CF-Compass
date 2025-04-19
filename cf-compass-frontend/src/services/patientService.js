import axios from 'axios';

const API_URL = (process.env.REACT_APP_API_URL || 'https://cf-compass.onrender.com').replace(/\/+$/, '');

// Get all patients
export const getPatients = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/patients`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error in getPatients:', error);
    throw error;
  }
};

// Get a single patient
export const getPatient = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/api/patients/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error in getPatient:', error);
    throw error;
  }
};

// Add a new patient
export const addPatient = async (patientData) => {
  try {
    const response = await axios.post(`${API_URL}/api/patients`, patientData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error in addPatient:', error);
    throw error;
  }
};

// Update a patient
export const updatePatient = async (id, patientData) => {
  try {
    const response = await axios.put(`${API_URL}/api/patients/${id}`, patientData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error in updatePatient:', error);
    throw error;
  }
};

// Delete a patient
export const deletePatient = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/api/patients/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error in deletePatient:', error);
    throw error;
  }
}; 