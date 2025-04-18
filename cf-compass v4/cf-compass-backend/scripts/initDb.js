const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Patient = require('../models/Patient');

// Read patient data from JSON file
const patientData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/patients.json'), 'utf8')
);

async function initializeDatabase() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cf-compass';
    console.log('Connecting to MongoDB for initialization...');
    
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

    await mongoose.connect(mongoURI, mongooseOptions);
    console.log('MongoDB connected for initialization');
    
    // Check if database is empty or has fewer patients than expected
    const count = await Patient.countDocuments({});
    console.log(`Current patient count in database: ${count}`);
    
    const expectedPatientCount = patientData.length;
    console.log(`Expected patient count: ${expectedPatientCount}`);
    
    if (count === 0 || count < expectedPatientCount) {
      console.log('Database needs initialization...');
      
      // Clear existing data if any
      if (count > 0) {
        console.log('Clearing existing patient data...');
        await Patient.deleteMany({});
      }
      
      // Format patients for MongoDB
      const formattedPatients = patientData.map(patient => ({
        resourceType: 'Patient',
        id: patient.id,
        name: [{
          given: [patient.name.split(' ')[0]],
          family: patient.name.split(' ')[1],
          text: patient.name
        }],
        gender: patient.gender,
        birthDate: patient.dob,
        variants: patient.variants || [],
        geneticSummary: patient.summary,
        clinicalDetails: patient.details,
        analysisProvider: patient.aiProvider || 'test',
        status: patient.status || 'Active',
        createdAt: new Date(),
        lastUpdated: new Date()
      }));
      
      // Insert patients into database
      const result = await Patient.insertMany(formattedPatients);
      console.log(`Successfully inserted ${result.length} patients`);
    } else {
      console.log('Database already contains data, skipping initialization');
    }
    
    // Close connection
    await mongoose.connection.close();
    console.log('Database initialization complete');
    
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
}

// Export for use in main application
module.exports = initializeDatabase;

// If script is run directly
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error during database initialization:', err);
      process.exit(1);
    });
} 