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
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  keepAlive: true,
  keepAliveInitialDelay: 300000,
  maxPoolSize: 50,
  retryWrites: true,
  w: 'majority',
  family: 4
};

let isConnecting = false;
let connectionRetryTimeout;

// Connect to MongoDB and initialize database
const connectWithRetry = async () => {
  if (isConnecting) {
    console.log('Connection attempt already in progress...');
    return;
  }

  try {
    isConnecting = true;
    clearTimeout(connectionRetryTimeout);

    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      isConnecting = false;
      return;
    }

    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
    console.log('MongoDB connected successfully');
    
    // Initialize database with sample data if empty
    const patientCount = await Patient.countDocuments({});
    if (patientCount === 0) {
      console.log('Database is empty, initializing with sample data...');
      try {
        await initializeDatabase();
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Error during database initialization:', error);
      }
    } else {
      console.log(`Database contains ${patientCount} patients, skipping initialization`);
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
    isConnecting = false;
    connectionRetryTimeout = setTimeout(connectWithRetry, 5000);
  } finally {
    isConnecting = false;
  }
};

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
  if (!isConnecting) {
    connectionRetryTimeout = setTimeout(connectWithRetry, 5000);
  }
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  if (!isConnecting) {
    connectionRetryTimeout = setTimeout(connectWithRetry, 5000);
  }
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
  clearTimeout(connectionRetryTimeout);
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
app.use(cors({
  origin: ['https://cf-compass-frontend.onrender.com', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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