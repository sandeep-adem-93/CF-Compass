// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize data directory and file
const initializeDataFile = async () => {
  const dataDir = path.join(__dirname, 'data');
  const dataFile = path.join(dataDir, 'patients_FHIR.json');
  
  try {
    // Create data directory if it doesn't exist
    await fs.mkdir(dataDir, { recursive: true });
    
    // Check if data file exists
    try {
      await fs.access(dataFile);
    } catch {
      // File doesn't exist, create it with initial structure
      const initialData = {
        resourceType: "Bundle",
        type: "collection",
        entry: []
      };
      await fs.writeFile(dataFile, JSON.stringify(initialData, null, 2));
      console.log('Created initial patients data file');
    }
  } catch (error) {
    console.error('Error initializing data file:', error);
  }
};

// Initialize data file before starting server
initializeDataFile().then(() => {
  // Middleware
  app.use(cors());
  app.use(bodyParser.json());

  // Import routes
  const patientsRouter = require('./routes/patients');
  const geneticRouter = require('./routes/genetic');

  // Register routes
  app.use('/api/patients', patientsRouter);
  app.use('/api/genetic', geneticRouter);

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});