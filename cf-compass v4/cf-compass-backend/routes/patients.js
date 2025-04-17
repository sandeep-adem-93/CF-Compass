// routes/patients.js
const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');

// Get all patients
router.get('/', async (req, res) => {
  try {
    const patients = await Patient.find({});
    res.json(patients);
  } catch (err) {
    console.error('Error fetching patients:', err);
    res.status(500).json({ error: 'Failed to retrieve patients' });
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
    const { id } = req.params;
    const deletedPatient = await Patient.findOneAndDelete({ id });
    
    if (!deletedPatient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Patient deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

module.exports = router;