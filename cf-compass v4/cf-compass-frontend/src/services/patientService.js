// src/services/patientService.js
import axios from 'axios';

// const API_URL = 'http://localhost:5000/api';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Get all patients
export const getPatients = async () => {
  try {
    const url = `${API_URL.replace(/\/+$/, '')}/patients`;
    console.log('Fetching patients from:', url);
    
    const response = await axios.get(url);
    console.log('Response status:', response.status);
    console.log('Raw API response data:', response.data);
    
    const processedPatients = response.data.map(patient => {
      console.log('Processing patient:', {
        originalId: patient.id,
        originalName: patient.name,
        originalGender: patient.gender,
        originalBirthDate: patient.birthDate
      });

      // Enhanced FHIR name handling
      let formattedName = 'Unknown';
      if (patient.name) {
        if (Array.isArray(patient.name)) {
          // Handle array of name objects
          const nameObj = patient.name[0];
          if (nameObj) {
            if (nameObj.text) {
              formattedName = nameObj.text;
            } else {
              const family = nameObj.family || '';
              const given = Array.isArray(nameObj.given) ? nameObj.given.join(' ') : (nameObj.given || '');
              const prefix = Array.isArray(nameObj.prefix) ? nameObj.prefix.join(' ') : (nameObj.prefix || '');
              const suffix = Array.isArray(nameObj.suffix) ? nameObj.suffix.join(' ') : (nameObj.suffix || '');
              
              // Build name parts
              const nameParts = [];
              if (prefix) nameParts.push(prefix);
              if (given) nameParts.push(given);
              if (family) nameParts.push(family);
              if (suffix) nameParts.push(suffix);
              
              formattedName = nameParts.join(' ').trim();
            }
          }
        } else if (typeof patient.name === 'string') {
          // Handle simple string name
          formattedName = patient.name;
        } else if (typeof patient.name === 'object') {
          // Handle single name object
          if (patient.name.text) {
            formattedName = patient.name.text;
          } else {
            const family = patient.name.family || '';
            const given = Array.isArray(patient.name.given) ? patient.name.given.join(' ') : (patient.name.given || '');
            const prefix = Array.isArray(patient.name.prefix) ? patient.name.prefix.join(' ') : (patient.name.prefix || '');
            const suffix = Array.isArray(patient.name.suffix) ? patient.name.suffix.join(' ') : (patient.name.suffix || '');
            
            const nameParts = [];
            if (prefix) nameParts.push(prefix);
            if (given) nameParts.push(given);
            if (family) nameParts.push(family);
            if (suffix) nameParts.push(suffix);
            
            formattedName = nameParts.join(' ').trim();
          }
        }
      }

      // Log name processing details
      console.log('Name processing details:', {
        originalName: patient.name,
        formattedName,
        nameType: Array.isArray(patient.name) ? 'array' : typeof patient.name
      });

      const processedPatient = {
        id: patient.id,
        name: formattedName,
        gender: patient.gender,
        birthDate: patient.birthDate,
        variants: patient.variants || [],
        geneticSummary: patient.geneticSummary,
        clinicalDetails: patient.clinicalDetails || [],
        analysisProvider: patient.analysisProvider || 'Unknown',
        status: patient.status || 'Active'
      };

      console.log('Processed patient:', processedPatient);
      return processedPatient;
    });

    console.log('Final processed patients:', processedPatients);
    return processedPatients;
  } catch (error) {
    console.error('Error fetching patients:', error);
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