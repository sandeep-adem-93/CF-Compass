const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const Patient = require('../models/Patient');

const DATA_FILE_PATH = path.join(__dirname, '..', 'data', 'patients.json');

async function migrateData() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cf-compass';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Read existing JSON data
    const jsonData = await fs.readFile(DATA_FILE_PATH, 'utf8');
    const patients = JSON.parse(jsonData);
    
    if (!Array.isArray(patients)) {
      console.error('Invalid data format in patients.json');
      process.exit(1);
    }

    // Delete existing records
    await Patient.deleteMany({});
    console.log('Cleared existing patient records');

    // Map the data to match our schema
    const formattedPatients = patients.map(patient => ({
      id: patient.id,
      name: patient.name,
      dob: patient.dob,
      gender: patient.gender,
      variants: patient.variants,
      status: patient.status,
      summary: patient.summary,
      details: patient.details,
      aiProvider: patient.aiProvider
    }));

    // Insert all patients
    const result = await Patient.insertMany(formattedPatients);
    console.log(`Successfully migrated ${result.length} patients to MongoDB`);

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrateData(); 