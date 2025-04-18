// cf-compass-backend/mockApiBackend.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const connectDB = require('./config/db');
const Patient = require('./models/Patient');
require('dotenv').config();
const mongoose = require('mongoose');

const { processFhirJsonFile } = require('./fhirtoprompt');
const { analyzeWithMultipleProviders } = require('./multi-model-processor');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected successfully');
  // Populate database with sample patients if empty
  Patient.countDocuments({})
    .then(count => {
      if (count === 0) {
        console.log('Database is empty, populating with sample patients...');
        const patients = require('./data/patients.json');
        const formattedPatients = patients.map(patient => ({
          resourceType: 'Patient',
          id: patient.id,
          name: [{
            given: [patient.name.split(' ')[0]],
            family: patient.name.split(' ')[1],
            text: patient.name
          }],
          gender: patient.gender,
          birthDate: patient.dob,
          variants: patient.variants,
          geneticSummary: patient.geneticSummary,
          clinicalDetails: patient.clinicalDetails,
          analysisProvider: patient.analysisProvider || 'test',
          status: 'Active'
        }));
        return Patient.insertMany(formattedPatients);
      }
    })
    .then(() => console.log('Database population complete'))
    .catch(err => console.error('Error populating database:', err));
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Middleware
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path} from ${req.headers.origin}`);
  res.header('Access-Control-Allow-Origin', 'https://cf-compass-frontend.onrender.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

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
    console.log('=== Patient API Request ===');
    console.log('MongoDB Connection Status:', mongoose.connection.readyState);
    console.log('MongoDB URL:', process.env.MONGODB_URI);
    
    const patients = await Patient.find({});
    console.log(`Found ${patients.length} patients in database`);
    
    // Format patients with proper name handling
    const formattedPatients = patients.map(patient => {
      const patientObj = patient.toObject();
      // Handle name array
      let formattedName = 'Unknown';
      if (Array.isArray(patientObj.name) && patientObj.name.length > 0) {
        const nameObj = patientObj.name[0];
        if (nameObj.given && nameObj.family) {
          formattedName = `${nameObj.given[0]} ${nameObj.family}`;
        } else if (nameObj.text) {
          formattedName = nameObj.text;
        }
      }
      
      return {
        ...patientObj,
        name: formattedName,
        id: patientObj.id,
        gender: patientObj.gender,
        birthDate: patientObj.birthDate,
        variants: patientObj.variants || [],
        geneticSummary: patientObj.geneticSummary,
        clinicalDetails: patientObj.clinicalDetails,
        analysisProvider: patientObj.analysisProvider,
        status: 'Active'
      };
    });
    
    console.log('First formatted patient:', formattedPatients[0]);
    res.json(formattedPatients);
  } catch (error) {
    console.error('Error in /api/patients:', error);
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
    console.log('=== Delete Patient Request ===');
    console.log('Patient ID:', req.params.id);
    console.log('MongoDB Connection Status:', mongoose.connection.readyState);
    
    const result = await Patient.deleteOne({ id: req.params.id });
    console.log('Delete result:', result);
    
    if (result.deletedCount === 0) {
      console.log('No patient found with ID:', req.params.id);
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    console.log('Successfully deleted patient:', req.params.id);
    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

// Upload a new patient (from FHIR format) and analyze with AI
app.post('/api/patients/upload', async (req, res) => {
  try {
    console.log('=== Patient Upload Request ===');
    console.log('Request body:', {
      hasPatientData: !!req.body.patientData,
      hasApiKey: !!req.body.apiKey,
      modelProvider: req.body.modelProvider
    });

    const { patientData, apiKey, modelProvider } = req.body;

    if (!patientData) {
      console.error('No patient data provided');
      return res.status(400).json({ error: 'Patient data is required' });
    }

    if (!apiKey) {
      console.error('No API key provided');
      return res.status(400).json({ error: 'API key is required' });
    }

    // Process the patient data
    const processedData = await processFhirJsonFile(patientData, apiKey, modelProvider);
    console.log('Processed patient data:', {
      id: processedData.id,
      name: processedData.name,
      hasVariants: !!processedData.variants
    });

    // Save to MongoDB
    const patient = new Patient(processedData);
    await patient.save();
    console.log('Patient saved to database:', patient.id);

    res.json({
      success: true,
      patient: {
        id: patient.id,
        name: patient.name,
        status: 'Active'
      }
    });
  } catch (error) {
    console.error('Error processing patient upload:', error);
    res.status(500).json({ error: 'Failed to process patient data' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});