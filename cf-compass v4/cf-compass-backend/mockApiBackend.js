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
const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
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

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://cf-compass.onrender.com',
    'https://cf-compass-frontend.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

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
    
    // Simplified patient formatting
    const formattedPatients = patients.map(patient => {
      const patientObj = patient.toObject();
      console.log('Processing patient:', patientObj.id);
      
      return {
        ...patientObj,
        name: patientObj.name || 'Unknown',
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
    
    console.log('Formatted patients:', formattedPatients);
    res.json(formattedPatients);
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
    console.log('Request body keys:', Object.keys(req.body));
    
    const { patientData, apiKey, modelProvider } = req.body;
    
    // Validate inputs
    if (!patientData) {
      console.error('Missing patient data');
      return res.status(400).json({ error: 'Patient data is required' });
    }
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      console.error('Invalid API key');
      return res.status(400).json({ error: 'Valid API key is required' });
    }
    if (!modelProvider || typeof modelProvider !== 'string') {
      console.error('Invalid model provider');
      return res.status(400).json({ error: 'Valid model provider is required' });
    }

    // Process the patient data
    console.log('Processing patient data with:', {
      modelProvider,
      apiKeyLength: apiKey.length,
      patientDataType: typeof patientData,
      patientDataKeys: Object.keys(patientData)
    });

    // First process the FHIR data
    console.log('Starting FHIR data processing...');
    const processedData = await processFhirJsonFile(patientData, apiKey.trim(), modelProvider.trim());
    console.log('Processed patient data:', {
      id: processedData.id,
      name: processedData.name,
      hasVariants: !!processedData.variants,
      variantsCount: processedData.variants?.length
    });

    // Then analyze with the LLM
    console.log('Starting LLM analysis...');
    const analysis = await analyzeWithMultipleProviders(patientData, apiKey.trim(), modelProvider.trim());
    console.log('LLM analysis completed:', {
      hasGeneticSummary: !!analysis.geneticSummary,
      hasClinicalDetails: !!analysis.clinicalDetails,
      clinicalDetailsCount: analysis.clinicalDetails?.length
    });

    // Combine the processed data with the LLM analysis
    const finalPatientData = {
      ...processedData,
      geneticSummary: analysis.geneticSummary,
      clinicalDetails: analysis.clinicalDetails,
      analysisProvider: modelProvider
    };

    console.log('Final patient data prepared:', {
      id: finalPatientData.id,
      name: finalPatientData.name,
      hasGeneticSummary: !!finalPatientData.geneticSummary,
      clinicalDetailsCount: finalPatientData.clinicalDetails?.length
    });

    // Save to MongoDB
    console.log('Saving patient to database...');
    const patient = new Patient(finalPatientData);
    await patient.save();
    console.log('Patient saved to database:', patient.id);

    res.json({
      success: true,
      patient: {
        id: patient.id,
        name: patient.name,
        status: 'Active'
      },
      patientId: patient.id
    });
  } catch (error) {
    console.error('Error processing patient upload:', error);
    console.error('Error stack:', error.stack);
    const errorMessage = error.message || 'Failed to process patient data';
    res.status(500).json({ error: errorMessage });
  }
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', require('./routes/patients'));

// Add authentication routes
app.use('/api/auth', authRoutes);

// Protect all patient routes with authentication
app.use('/api/patients', authMiddleware.verifyToken);

// Add role-based access control for patient operations
app.post('/api/patients', authMiddleware.isGeneticCounselor, async (req, res) => {
  // ... existing patient creation code ...
});

app.delete('/api/patients/:id', authMiddleware.isGeneticCounselor, async (req, res) => {
  // ... existing patient deletion code ...
});

// Medical receptionists can only view patients
app.get('/api/patients', async (req, res) => {
  // ... existing patient retrieval code ...
});

// Catch-all route to serve the React app
app.get('*', (req, res) => {
  // Check if the request is for an API endpoint
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // For all other routes, serve the frontend application
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error handling middleware:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});