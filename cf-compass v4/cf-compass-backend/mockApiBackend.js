// cf-compass-backend/mockApiBackend.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const connectDB = require('./config/db');
const Patient = require('./models/Patient');
require('dotenv').config();

const { processFhirJsonFile } = require('./fhirtoprompt');
const { analyzeWithMultipleProviders } = require('./multi-model-processor');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: [
    'https://cf-compass-frontend.onrender.com',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'CF Compass API is running',
    timestamp: new Date().toISOString()
  });
});

// Get all patients
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await Patient.find({});
    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Get a specific patient
app.get('/api/patients/:id', async (req, res) => {
  try {
    const patient = await Patient.findOne({ id: req.params.id });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// Delete a patient
app.delete('/api/patients/:id', async (req, res) => {
  try {
    const result = await Patient.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

// Upload a new patient (from FHIR format) and analyze with AI
app.post('/api/patients/upload', async (req, res) => {
  try {
    console.log('Received /api/patients/upload request');
    
    if (!req.body) {
      return res.status(400).json({ error: 'Request body is empty' });
    }
    
    const { patientData: rawPatientData, apiKey, modelProvider = 'gemini' } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    
    if (!rawPatientData) {
      return res.status(400).json({ error: 'Patient data is required' });
    }

    let processedPatientData = typeof rawPatientData === 'string' 
      ? JSON.parse(rawPatientData) 
      : rawPatientData;

    console.log('Processing FHIR Bundle:', processedPatientData.resourceType);

    // Validate FHIR format
    if (!processedPatientData.resourceType || processedPatientData.resourceType !== 'Bundle') {
      return res.status(400).json({ error: 'Invalid FHIR format: Must be a Bundle' });
    }

    if (!processedPatientData.entry || !Array.isArray(processedPatientData.entry)) {
      return res.status(400).json({ error: 'Invalid FHIR format: Entry array is missing' });
    }

    const patientResource = processedPatientData.entry.find(
      entry => entry?.resource?.resourceType === 'Patient'
    )?.resource;

    if (!patientResource) {
      return res.status(400).json({ error: 'Patient resource not found in bundle' });
    }

    console.log('Found patient resource:', patientResource.id);

    // Extract variants from MolecularSequence resources
    const variants = [];
    console.log('Looking for MolecularSequence resources...');

    processedPatientData.entry.forEach(entry => {
      const resource = entry.resource;
      if (resource.resourceType === 'MolecularSequence' && 
          resource.patient?.reference === `Patient/${patientResource.id}`) {
        console.log('Found MolecularSequence for patient:', resource.id);
        console.log('Variants in resource:', resource.variant);
        
        (resource.variant || []).forEach(variant => {
          if (variant.gene === 'CFTR' && variant.variantType) {
            const variantType = variant.variantType.trim();
            console.log('Processing variant:', variantType);
            if (!variants.includes(variantType)) {
              variants.push(variantType);
            }
          }
        });
      }
    });

    console.log('Extracted variants:', variants);

    console.log('Processing patient data with AI...');
    
    // Process with AI
    const result = await analyzeWithMultipleProviders(
      processedPatientData,
      apiKey,
      modelProvider
    );

    console.log('AI analysis complete');

    // Format the full name properly
    const firstName = patientResource.name?.[0]?.given?.[0] || '';
    const lastName = patientResource.name?.[0]?.family || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Unknown';

    // Prepare patient data
    const patientData = {
      id: patientResource.id,
      name: fullName,
      dob: patientResource.birthDate,
      gender: patientResource.gender,
      variants: variants,
      status: 'Active',
      summary: result.geneticSummary,
      details: result.clinicalDetails,
      aiProvider: result.providerUsed
    };

    console.log('Patient data to be saved:', {
      id: patientData.id,
      name: patientData.name,
      variants: patientData.variants
    });

    // Try to update existing patient, if not found create new one
    const updatedPatient = await Patient.findOneAndUpdate(
      { id: patientData.id },
      patientData,
      { 
        new: true,          // Return the updated document
        upsert: true,       // Create if doesn't exist
        runValidators: true // Run model validations
      }
    );

    console.log('Saved patient data:', {
      id: updatedPatient.id,
      name: updatedPatient.name,
      variants: updatedPatient.variants
    });

    res.json({
      success: true,
      message: 'Patient data processed and saved successfully',
      patient: updatedPatient,
      patientId: updatedPatient.id,
      aiProvider: result.providerUsed
    });

  } catch (error) {
    console.error('Error processing patient data:', error);
    res.status(500).json({ 
      error: 'Failed to process patient data',
      details: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});