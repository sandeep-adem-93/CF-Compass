// cf-compass-backend/mockApiBackend.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
// const { analyzeFhirWithGemini } = require('./gemini');
const { processFhirJsonFile } = require('./fhirtoprompt');
// const { analyzeFhirWithLangChain } = require('./langchain-processor');
const { analyzeWithMultipleProviders } = require('./multi-model-processor');

const app = express();
const PORT = process.env.PORT || 5000;

// FHIR data storage
let patientData = [];
const DATA_FILE_PATH = path.join(__dirname, 'data', 'patients.json');

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Increased limit for larger FHIR bundles

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Load initial data
const loadData = async () => {
  try {
    const data = await fs.readFile(DATA_FILE_PATH, 'utf8');
    patientData = JSON.parse(data);
    console.log(`Loaded ${patientData.length} patient records`);
  } catch (error) {
    console.error('Error loading patient data:', error);
    // Initialize with empty array if file doesn't exist
    patientData = [];
    await saveData();
  }
};

// Save data to file
const saveData = async () => {
  try {
    await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(patientData, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving patient data:', error);
  }
};

// API Routes
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'CF Compass API is running',
    timestamp: new Date().toISOString()
  });
});

// Get all patients
app.get('/api/patients', (req, res) => {
  res.json(patientData);
});

// Get a specific patient
app.get('/api/patients/:id', (req, res) => {
  const { id } = req.params;
  
  // Find the specific patient
  const patient = patientData.find(p => p.id === id);
  
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }
  
  res.json(patient);
});

// Helper function to log FHIR structure
function logFhirStructure(data) {
  console.log('--- FHIR Structure Analysis ---');
  console.log('Type:', typeof data);
  
  if (typeof data === 'object' && data !== null) {
    console.log('Keys:', Object.keys(data));
    console.log('ResourceType:', data.resourceType);
    
    if (data.entry && Array.isArray(data.entry)) {
      console.log('Entry count:', data.entry.length);
      
      // Log resource types in the bundle
      const resourceTypes = {};
      data.entry.forEach(entry => {
        if (entry.resource && entry.resource.resourceType) {
          const type = entry.resource.resourceType;
          resourceTypes[type] = (resourceTypes[type] || 0) + 1;
        }
      });
      
      console.log('Resource types found:', resourceTypes);
    } else {
      console.log('No valid entry array found');
    }
  } else {
    console.log('Data is not an object');
  }
  console.log('--- End FHIR Structure Analysis ---');
}

// Upload a new patient (from FHIR format) and analyze with AI
app.post('/api/patients/upload', async (req, res) => {
  try {
    console.log('Received /api/patients/upload request');
    console.log('Request body keys:', Object.keys(req.body));
    
    // Check what's in the request
    if (!req.body) {
      return res.status(400).json({ error: 'Request body is empty' });
    }
    
    const rawPatientData = req.body.patientData;
    const apiKey = req.body.apiKey;
    const modelProvider = req.body.modelProvider || 'gemini'; // Default to Gemini if not specified
    
    console.log('API Key present:', !!apiKey)


    console.log('Model Provider:', modelProvider);
    console.log('Patient data present:', !!rawPatientData);


    
    if (rawPatientData) {
      console.log('Patient data type:', typeof rawPatientData);
      if (typeof rawPatientData === 'object') {
        console.log('Patient data keys:', Object.keys(rawPatientData));
        console.log('ResourceType:', rawPatientData.resourceType);
      }
      
      // Run the detailed diagnostic
      logFhirStructure(rawPatientData);
    }
    
    // Validate API key
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    
    // Process patient data
    let processedPatientData = rawPatientData;
    if (typeof rawPatientData === 'string') {
      try {
        processedPatientData = JSON.parse(rawPatientData);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid JSON format in patient data' });
      }
    }

    
    // Validate FHIR format
    if (!processedPatientData || !processedPatientData.resourceType) {
      return res.status(400).json({ error: 'Invalid FHIR format: Missing resourceType' });
    }
    
    if (processedPatientData.resourceType !== 'Bundle') {
      return res.status(400).json({ error: 'Invalid FHIR format: Resource type must be Bundle' });
    }
    
    // Extract patient information
    if (!processedPatientData.entry || !Array.isArray(processedPatientData.entry)) {
      return res.status(400).json({ error: 'Invalid FHIR format: Entry array is missing' });
    }
    
    console.log(`Found ${processedPatientData.entry.length} entries in the FHIR bundle`);
    
    const patientResource = processedPatientData.entry.find(
      entry => entry?.resource && entry.resource.resourceType === 'Patient'
    )?.resource;
    
    if (!patientResource) {
      return res.status(400).json({ error: 'Patient resource not found in bundle' });
    }
    
    console.log('Found patient resource:', patientResource.id);
    
    // Write the processed FHIR data to a temporary file
    const tempFilePath = path.join(__dirname, `${patientResource.id || 'temp'}_fhir.json`);
    await fs.writeFile(tempFilePath, JSON.stringify(processedPatientData, null, 2), 'utf8');
    
    // Process with AI
    let geneticSummary = '';
    let clinicalDetails = '';
    let usedProvider = modelProvider;

       // Inside your endpoint, before calling the AI service:
    // Convert the FHIR data to a patient description
    const fhirJson = JSON.stringify(processedPatientData);
    const patientDescription = processFhirJsonFile(fhirJson);
    console.log("Generated patient description from FHIR data");
    
    try {
      if (apiKey === 'test-key') {
        console.log('Using test key, skipping actual AI API call');
        console.log('Patient description:', patientDescription);
        geneticSummary = "F508del mutation is the most common CFTR mutation, accounting for approximately 50% of all CF alleles. This mutation leads to misfolding of the CFTR protein, preventing it from reaching the cell surface and performing its chloride channel function.";
        clinicalDetails = "Patient exhibits moderate to severe lung disease (FEV1 52%). Chronic infection is likely contributing significantly to disease progression. Consider CFTR modulator therapy. Regular monitoring of pulmonary function and nutritional status is recommended.";
        usedProvider = 'test';
      } else {
        // Use LangChain to process with the selected model
        console.log(`Calling ${modelProvider} API for analysis via LangChain`);
        
        const analysis = await analyzeWithMultipleProviders(
          tempFilePath,
          modelProvider,
          apiKey
        );
        
        geneticSummary = analysis.geneticSummary;
        clinicalDetails = analysis.clinicalDetails;
        usedProvider = analysis.providerUsed;
      }
    } catch (aiError) {
      console.error('Error calling AI API:', aiError);
      geneticSummary = "AI analysis failed. Please try again with a valid API key.";
      clinicalDetails = "AI analysis failed. Please try again with a valid API key.";
      usedProvider = 'error';
    }
    
    // Clean up the temporary file
    try {
      await fs.unlink(tempFilePath);
    } catch (unlinkError) {
      console.warn('Warning: Could not delete temporary file:', unlinkError);
    }
    
    // Extract other important information from the FHIR bundle
    const molecularResource = processedPatientData.entry.find(
      entry => entry.resource && entry.resource.resourceType === 'MolecularSequence'
    )?.resource;
    
    const variants = molecularResource?.variant?.map(v => v.variantType) || [];
    
    const conditionResource = processedPatientData.entry.find(
      entry => entry.resource && entry.resource.resourceType === 'Condition'
    )?.resource;
    
    const status = conditionResource?.clinicalStatus?.coding?.[0]?.code === 'active' ? 'Active' : 'Inactive';
    
    // Create simplified patient object
    const simplifiedPatient = {
      id: patientResource.id || `patient_${Date.now()}`,
      name: `${patientResource.name?.[0]?.given?.[0] || ''} ${patientResource.name?.[0]?.family || ''}`.trim() || 'Unknown',
      dob: patientResource.birthDate || new Date().toISOString().split('T')[0],
      gender: patientResource.gender || 'unknown',
      variants: variants,
      status: status,
      summary: geneticSummary,
      details: clinicalDetails,
      aiProvider: usedProvider
    };
    
    console.log('Created simplified patient:', simplifiedPatient.id);
    
    // Check if patient already exists
    const existingIndex = patientData.findIndex(p => p.id === simplifiedPatient.id);
    
    if (existingIndex >= 0) {
      // Update existing patient
      patientData[existingIndex] = simplifiedPatient;
    } else {
      // Add new patient
      patientData.push(simplifiedPatient);
    }
    
    // Save to file
    await saveData();
    
    res.json({ 
      success: true, 
      message: 'Patient data uploaded and analyzed successfully', 
      patientId: simplifiedPatient.id,
      patient: simplifiedPatient,
      aiProvider: usedProvider
    });
    
  } catch (error) {
    console.error('Error processing patient data:', error);
    res.status(500).json({ error: 'Failed to process patient data: ' + error.message });
  }
});

// Delete a patient
app.delete('/api/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the patient index
    const patientIndex = patientData.findIndex(p => p.id === id);
    
    if (patientIndex === -1) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    // Remove patient from the data array
    patientData.splice(patientIndex, 1);
    
    // Save the updated data to patients.json
    await saveData();
    
    // Update patients_FHIR.json
    const fhirDataPath = path.join(__dirname, 'data', 'patients_FHIR.json');
    try {
      const fhirData = JSON.parse(await fs.readFile(fhirDataPath, 'utf8'));
      
      // Remove the patient from the FHIR data
      if (fhirData.entry) {
        fhirData.entry = fhirData.entry.filter(entry => {
          if (entry.resource && entry.resource.resourceType === 'Patient') {
            return entry.resource.id !== id;
          }
          return true;
        });
      }
      
      // Save the updated FHIR data
      await fs.writeFile(fhirDataPath, JSON.stringify(fhirData, null, 2), 'utf8');
      console.log(`Updated patients_FHIR.json for patient ${id}`);
    } catch (error) {
      console.warn(`Error updating patients_FHIR.json: ${error.message}`);
    }
    
    // Delete individual patient files if they exist
    const fhirFilePath = path.join(__dirname, 'data', `${id}_fhir.json`);
    try {
      await fs.unlink(fhirFilePath);
      console.log(`Deleted FHIR file for patient ${id}`);
    } catch (error) {
      console.warn(`No FHIR file found for patient ${id}`);
    }
    
    const reportFilePath = path.join(__dirname, 'data', `${id}_report.json`);
    try {
      await fs.unlink(reportFilePath);
      console.log(`Deleted report file for patient ${id}`);
    } catch (error) {
      console.warn(`No report file found for patient ${id}`);
    }
    
    res.json({ 
      success: true, 
      message: `Patient ${id} deleted successfully` 
    });
    
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient: ' + error.message });
  }
});

// Start the server
app.listen(PORT, async () => {
  // Load data before accepting requests
  await loadData();
  console.log(`Mock API server running on port ${PORT}`);
});