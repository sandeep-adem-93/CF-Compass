// routes/patients.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

const getDataFilePath = () => path.join(__dirname, '../data/patients_FHIR.json');

// Get all patients
router.get('/', async (req, res) => {
  try {
    const fileContent = await fs.readFile(getDataFilePath(), 'utf8');
    const patientsData = JSON.parse(fileContent);
    
    // Extract patient data from the bundle
    const patients = patientsData.entry
      .filter(entry => entry.resource.resourceType === 'Patient')
      .map(entry => {
        const patient = entry.resource;
        return {
          id: patient.id,
          name: patient.name && patient.name[0] ? 
                `${patient.name[0].given?.[0] || ''} ${patient.name[0].family || ''}`.trim() : 
                'Unknown',
          dob: patient.birthDate || 'Unknown',
          gender: patient.gender || 'Unknown',
          variants: ['Unknown'], // You can update this based on your data
          status: 'Active'
        };
      });
    
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
    
    // Read existing patients file
    const fileContent = await fs.readFile(getDataFilePath(), 'utf8');
    const patientsData = JSON.parse(fileContent);
    
    // Handle both single resource and bundle formats
    let entriesToAdd = [];
    if (inputData.resourceType === 'Bundle' && Array.isArray(inputData.entry)) {
      entriesToAdd = inputData.entry;
    } else if (inputData.resourceType) {
      entriesToAdd = [{ resource: inputData }];
    } else {
      return res.status(400).json({ 
        error: 'Invalid FHIR format. Data must be a FHIR resource or Bundle'
      });
    }
    
    // Merge the new entries with existing data
    patientsData.entry = [...patientsData.entry, ...entriesToAdd];
    
    // Write the updated data back to the file
    await fs.writeFile(
      getDataFilePath(),
      JSON.stringify(patientsData, null, 2),
      'utf8'
    );
    
    res.status(201).json({ 
      success: true,
      message: `Successfully added ${entriesToAdd.length} resources`
    });
  } catch (err) {
    console.error('Error uploading patient data:', err);
    res.status(500).json({ error: 'Failed to upload patient data' });
  }
});

module.exports = router;