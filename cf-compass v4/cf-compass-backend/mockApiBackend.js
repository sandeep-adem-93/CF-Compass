// cf-compass-backend/mockApiBackend.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const connectDB = require('./config/db');
const Patient = require('./models/Patient');
const initializeDatabase = require('./scripts/initDb');
require('dotenv').config();
const mongoose = require('mongoose');

const { processFhirJsonFile } = require('./fhirtoprompt');
const { analyzeWithMultipleProviders } = require('./multi-model-processor');

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection options
const mongooseOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50
};

let isConnecting = false;

// Connect to MongoDB and initialize database
const connectWithRetry = async () => {
  if (isConnecting) {
    console.log('Connection attempt already in progress...');
    return;
  }

  try {
    isConnecting = true;

    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      isConnecting = false;
      return;
    }

    // Close any existing connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
    console.log('MongoDB connected successfully');
    
    // Initialize database with sample data if empty
    try {
      await initializeDatabase();
    } catch (error) {
      console.error('Error during database initialization:', error);
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  } finally {
    isConnecting = false;
  }
};

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
  connectWithRetry();
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Initial connection
connectWithRetry();

// Middleware to check MongoDB connection before handling requests
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    console.log('MongoDB not connected, attempting to reconnect...');
    await connectWithRetry();
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database connection unavailable' });
    }
  }
  next();
});

// Middleware
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path} from ${req.headers.origin}`);
  const allowedOrigins = [
    'https://cf-compass-frontend.onrender.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
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
      
      // If name is still Unknown, try to get it from geneticSummary
      if (formattedName === 'Unknown' && patientObj.geneticSummary) {
        const nameMatch = patientObj.geneticSummary.match(/Patient (\w+ \w+)/);
        if (nameMatch) {
          formattedName = nameMatch[1];
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