// src/services/patientService.js
import axios from 'axios';

const API_URL = 'https://cf-compass.onrender.com';

// Get all patients
export const getPatients = async (token) => {
  try {
    const url = `${API_URL}/api/patients`;
    console.log('Fetching patients from:', url);
    console.log('Using token:', token ? `${token.substring(0, 5)}...` : 'none');
    
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('Response status:', response.status);
    console.log('API response data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in getPatients:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Error details:', error.response.data);
    }
    throw error;
  }
};

// Get a specific patient by id
export const getPatientById = async (id, token) => {
  try {
    const url = `${API_URL.replace(/\/+$/, '')}/api/patients/${id}`;
    console.log('Fetching patient:', id);
    console.log('Using token:', token ? `${token.substring(0, 5)}...` : 'none');
    
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Patient data:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error fetching patient ${id}:`, error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Error details:', error.response.data);
    }
    throw error;
  }
};

// Upload and analyze patient data
export const uploadPatientData = async (requestData, token) => {
  try {
    console.log('=== PATIENT SERVICE: uploadPatientData called ===');
    const url = `${API_URL.replace(/\/+$/, '')}/api/patients/upload`;
    console.log('Uploading patient data to:', url);
    console.log('Using token:', token ? `${token.substring(0, 5)}...` : 'none');
    
    const { patientData, apiKey, modelProvider } = requestData;
    
    // Validate inputs
    if (!patientData) {
      console.error('Missing patient data');
      throw new Error('Patient data is required');
    }
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      console.error('Invalid API key');
      throw new Error('Valid API key is required');
    }
    if (!modelProvider || typeof modelProvider !== 'string') {
      console.error('Invalid model provider');
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
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
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

// Delete a patient
export const deletePatient = async (patientId, token) => {
  try {
    console.log('=== Delete Patient Request ===');
    console.log('Patient ID:', patientId);
    console.log('Using token:', token ? `${token.substring(0, 5)}...` : 'none');
    
    const url = `${API_URL.replace(/\/+$/, '')}/api/patients/${patientId}`;
    console.log('Delete URL:', url);
    
    const response = await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Delete result:', response.data);
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

// Helper function to calculate age from birth date
export const calculateAge = (birthDate) => {
  console.log('Calculating age for birth date:', birthDate);
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  console.log('Calculated age:', age);
  return age;
};

export default {
  getPatients,
  getPatientById,
  uploadPatientData,
  calculateAge,
  deletePatient
};