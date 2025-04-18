const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const patients = require('../data/patients.json');
require('dotenv').config();

async function populateDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Clear existing patients
    await Patient.deleteMany({});
    console.log('Cleared existing patients');

    // Insert new patients
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

    await Patient.insertMany(formattedPatients);
    console.log(`Successfully inserted ${formattedPatients.length} patients`);

    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error populating database:', error);
    process.exit(1);
  }
}

populateDatabase(); 