import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const getPatients = async () => {
  try {
    const response = await axios.get(`${API_URL}/patients`);
    return response.data;
  } catch (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }
};

export const getPatient = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/patients/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching patient ${id}:`, error);
    throw error;
  }
  
};

// services/api.js - add this function to your existing file

export const uploadPatientData = async (patientData) => {
  try {
    const response = await axios.post(`${API_URL}/patients/upload`, patientData);
    return response.data;
  } catch (error) {
    console.error('Error uploading patient data:', error);
    if (error.response && error.response.data) {
      throw new Error(error.response.data.error || 'Failed to upload patient data');
    }
    throw error;
  }
};