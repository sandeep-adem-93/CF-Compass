// src/services/patientService.js
import axios from 'axios';

const API_URL = 'https://cf-compass.onrender.com';

// Get all patients
export const getPatients = async (token) => {
  try {
    const url = `${API_URL}/api/patients`;
    console.log('Fetching patients from:', url);
    
    if (!token) {
      throw new Error('Authentication token is required');
    }
    
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('Response status:', response.status);
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
    const url = `${API_URL}/api/patients/${id}`;
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
    const url = `${API_URL}/api/patients/upload`;
    console.log('Uploading patient data to:', url);
    
    if (!token) {
      throw new Error('Authentication token is required');
    }
    
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
    throw error;
  }
};

// Delete a patient
export const deletePatient = async (patientId, token) => {
  try {
    console.log('=== Delete Patient Request ===');
    console.log('Patient ID:', patientId);
    console.log('Token exists:', !!token);
    
    if (!token) {
      console.error('No token provided for delete request');
      throw new Error('Authentication token is required');
    }
    
    const url = `${API_URL}/api/patients/${patientId}`;
    console.log('Delete URL:', url);
    
    const response = await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Delete result:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error deleting patient:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Error details:', error.response.data);
      console.error('Error headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    throw error;
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