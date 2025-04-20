// routes/patients.js
const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const { auth } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// Get all patients
router.get('/', async (req, res) => {
  try {
    console.log('=== Get All Patients ===');
    console.log('User making request:', {
      userId: req.user.userId,
      role: req.user.role
    });
    
    const patients = await Patient.find();
    console.log('Found patients:', patients.length);
    res.json(patients);
  } catch (error) {
    console.error('Error getting patients:', error);
    res.status(500).json({ error: 'Failed to get patients' });
  }
});

// Get a single patient
router.get('/:id', async (req, res) => {
  try {
    console.log('=== Get Single Patient ===');
    console.log('Patient ID:', req.params.id);
    console.log('User making request:', {
      userId: req.user.userId,
      role: req.user.role
    });
    
    const patient = await Patient.findOne({ id: req.params.id });
    if (!patient) {
      console.log('Patient not found');
      return res.status(404).json({ error: 'Patient not found' });
    }
    console.log('Patient found:', patient.id);
    res.json(patient);
  } catch (error) {
    console.error('Error getting patient:', error);
    res.status(500).json({ error: 'Failed to get patient' });
  }
});

// Upload new patient data
router.post('/upload', async (req, res) => {
  try {
    const inputData = req.body;
    
    if (!inputData || !Object.keys(inputData).length) {
      return res.status(400).json({ error: 'No patient data provided' });
    }

    // Handle both single resource and bundle formats
    let patientsToAdd = [];
    
    if (inputData.resourceType === 'Bundle' && Array.isArray(inputData.entry)) {
      // Bundle format
      patientsToAdd = inputData.entry
        .filter(entry => entry.resource.resourceType === 'Patient')
        .map(entry => entry.resource);
    } else if (inputData.resourceType === 'Patient') {
      // Single patient format
      patientsToAdd = [inputData];
    } else {
      return res.status(400).json({ 
        error: 'Invalid FHIR format. Data must be a FHIR Patient resource or Bundle'
      });
    }

    if (patientsToAdd.length === 0) {
      return res.status(400).json({ error: 'No patient resource found in the uploaded data' });
    }

    // Check for duplicate patient IDs
    const existingIds = await Patient.find({ 
      id: { $in: patientsToAdd.map(p => p.id) } 
    }).select('id');

    const duplicates = existingIds.map(p => p.id);
    if (duplicates.length > 0) {
      return res.status(409).json({ 
        error: `Patient(s) with ID(s) ${duplicates.join(', ')} already exist` 
      });
    }

    // Save new patients
    const savedPatients = await Patient.insertMany(patientsToAdd);
    
    res.status(201).json({ 
      success: true,
      message: `Successfully added ${savedPatients.length} patients`,
      patients: savedPatients
    });
  } catch (err) {
    console.error('Error uploading patient data:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to upload patient data'
    });
  }
});

// Delete a patient
router.delete('/:id', async (req, res) => {
  try {
    console.log('=== Delete Patient ===');
    console.log('Patient ID:', req.params.id);
    console.log('User making request:', {
      userId: req.user.userId,
      role: req.user.role
    });
    
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
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

module.exports = router;