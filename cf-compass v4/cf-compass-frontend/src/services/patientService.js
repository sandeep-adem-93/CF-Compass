// src/services/patientService.js
import axios from 'axios';

// const API_URL = 'http://localhost:5000/api';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Get all patients
export const getPatients = async () => {
  try {
    const url = `${API_URL.replace(/\/+$/, '')}/api/patients`;
    console.log('Fetching patients from:', url);
    const response = await fetch(url);
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('API response data:', data);
    return data;
  } catch (error) {
    console.error('Error in getPatients:', error);
    throw error;
  }
};

// Get a specific patient by id
export const getPatientById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/patients/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching patient ${id}:`, error);
    throw error;
  }
};

// Upload and analyze patient data
export const uploadPatientData = async (requestData) => {
  try {
    console.log('=== PATIENT SERVICE: uploadPatientData called ===');
    const url = `${API_URL.replace(/\/+$/, '')}/api/patients/upload`;
    console.log('Uploading patient data to:', url);
    
    const { patientData, apiKey, modelProvider } = requestData;
    
    // Validate inputs
    if (!patientData) {
      throw new Error('Patient data is required');
    }
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throw new Error('Valid API key is required');
    }
    if (!modelProvider || typeof modelProvider !== 'string') {
      throw new Error('Model provider is required');
    }

    // Debug logs
    console.log('Request validation passed:');
    console.log('- API Key:', apiKey ? `${apiKey.substring(0, 5)}... (length: ${apiKey.length})` : 'missing');
    console.log('- Model provider:', modelProvider);
    console.log('- Patient data type:', typeof patientData);
    console.log('- Patient data keys:', Object.keys(patientData));

    // Make the API request
    console.log('Making request to:', url);
    const response = await axios.post(url, {
      patientData,
      apiKey: apiKey.trim(),
      modelProvider: modelProvider.trim()
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Response received:', {
      status: response.status,
      success: response.data.success,
      patientId: response.data.patientId
    });
    
    return response.data;
  } catch (error) {
    console.error('Error uploading patient data:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Error details:', error.response.data);
    }
    throw error.response?.data?.error || new Error('Failed to upload patient data');
  }
};

// Calculate age from date of birth
export const calculateAge = (dob) => {
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

// Delete a patient
export const deletePatient = async (patientId) => {
  try {
    console.log('Deleting patient with ID:', patientId);
    const url = `${API_URL.replace(/\/+$/, '')}/api/patients/${patientId}`;
    console.log('Delete URL:', url);
    
    const response = await axios.delete(url);
    console.log('Response status:', response.status);
    return response.data;
  } catch (error) {
    console.error('Error deleting patient', patientId, ':', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Error details:', error.response.data);
    }
    throw new Error('Failed to delete patient');
  }
};

export default {
  getPatients,
  getPatientById,
  uploadPatientData,
  calculateAge,
  deletePatient
};