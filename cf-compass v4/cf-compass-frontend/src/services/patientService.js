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
export const uploadPatientData = async (data) => {
  try {
    console.log('=== PATIENT SERVICE: uploadPatientData called ===');
    console.log('Uploading patient data to:', `${API_URL}/patients/upload`);
    
    // Check if we received both required parameters
    if (!data) {
      console.error('No data provided to uploadPatientData');
      throw new Error('No upload data provided');
    }
    
    // Add more detailed logging
    console.log('API Key provided:', data.apiKey ? 'Yes (length: ' + data.apiKey.length + ')' : 'No');
    console.log('Model provider:', data.modelProvider || 'gemini (default)');
    console.log('Patient data provided:', data.patientData ? 'Yes (type: ' + typeof data.patientData + ')' : 'No');
    
    // Validate required fields
    if (!data.patientData) {
      console.error('Patient data is missing from request');
      throw new Error('Patient data is required');
    }
    
    if (!data.apiKey) {
      console.error('API key is missing from request');
      throw new Error('API key is required');
    }
    
    // Create a clean payload with only what we need
    const payload = {
      patientData: data.patientData,
      apiKey: data.apiKey.trim(), // Trim whitespace
      modelProvider: data.modelProvider || 'gemini' // Default to gemini if not specified
    };
    
    console.log('Request payload structure:', {
      hasPatientData: !!payload.patientData,
      patientDataType: typeof payload.patientData,
      resourceType: typeof payload.patientData === 'object' ? payload.patientData?.resourceType : 'unknown',
      hasApiKey: !!payload.apiKey,
      apiKeyLength: payload.apiKey.length,
      modelProvider: payload.modelProvider
    });
    
    // Set a reasonable timeout
    const response = await axios.post(`${API_URL}/patients/upload`, payload, {
      timeout: 60000, // 60 second timeout (AI models can take time)
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response received from server:', {
      status: response.status,
      hasData: !!response.data,
      success: response.data?.success,
      aiProvider: response.data?.aiProvider || 'unknown'
    });
    
    return response.data;
  } catch (error) {
    console.error('Error uploading patient data:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Error details:', error.response.data);
      throw new Error(error.response.data.error || 'Failed to upload patient data');
    }
    throw error;
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

// src/services/patientService.js
// Add this function to your existing file

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