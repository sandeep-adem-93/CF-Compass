// routes/patients.js
const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const router = express.Router(); // This line is missing in your code

// Upload new patient data
router.post('/upload', async (req, res) => {
  try {
    // Validate input
    const inputData = req.body;
    
    if (!inputData || !Object.keys(inputData).length) {
      return res.status(400).json({ error: 'No patient data provided' });
    }
    
    // Read existing patients file
    const fileContent = await fs.readFile(path.join(__dirname, '../data/patients_FHIR.json'), 'utf8');
    const patientsData = JSON.parse(fileContent);
    
    // Handle both single resource and bundle formats
    let entriesToAdd = [];
    
    if (inputData.resourceType === 'Bundle' && Array.isArray(inputData.entry)) {
      // Bundle format
      entriesToAdd = inputData.entry;
    } else if (inputData.resourceType) {
      // Single resource format
      entriesToAdd = [{ resource: inputData }];
    } else {
      return res.status(400).json({ 
        error: 'Invalid FHIR format. Data must be a FHIR resource or Bundle'
      });
    }
    
    // Extract patient IDs from the new data
    const newPatientEntries = entriesToAdd.filter(
      entry => entry.resource.resourceType === 'Patient'
    );
    
    if (newPatientEntries.length === 0) {
      return res.status(400).json({ error: 'No patient resource found in the uploaded data' });
    }
    
    const newPatientIds = newPatientEntries.map(entry => entry.resource.id);
    
    // Check for duplicate patient IDs
    const existingIds = patientsData.entry
      .filter(entry => entry.resource.resourceType === 'Patient')
      .map(entry => entry.resource.id);
    
    const duplicates = newPatientIds.filter(id => existingIds.includes(id));
    
    if (duplicates.length > 0) {
      return res.status(409).json({ 
        error: `Patient(s) with ID(s) ${duplicates.join(', ')} already exist` 
      });
    }
    
    // Merge the new entries with existing data
    patientsData.entry = [...patientsData.entry, ...entriesToAdd];
    
    // Write the updated data back to the file
    await fs.writeFile(
      path.join(__dirname, '../data/patients_FHIR.json'), 
      JSON.stringify(patientsData, null, 2), 
      'utf8'
    );
    
    res.status(201).json({ 
      success: true,
      message: `Successfully added ${entriesToAdd.length} resources including patient(s): ${newPatientIds.join(', ')}`,
      patientIds: newPatientIds
    });
  } catch (err) {
    console.error('Error uploading patient data:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to upload patient data'
    });
  }
});


// Get all patients
router.get('/', async (req, res) => {
  try {
    const fileContent = await fs.readFile(
      path.join(__dirname, '../data/patients_FHIR.json'), 
      'utf8'
    );
    const patientsData = JSON.parse(fileContent);
    
    // Extract patient data from the bundle
    const patients = patientsData.entry
      .filter(entry => entry.resource.resourceType === 'Patient')
      .map(entry => {
        const patient = entry.resource;
        
        // Look for MolecularSequence resources for this patient
        const variants = patientsData.entry
          .filter(e => 
            e.resource.resourceType === 'MolecularSequence' && 
            e.resource.patient?.reference === `Patient/${patient.id}`
          )
          .flatMap(e => {
            if (e.resource.variant && Array.isArray(e.resource.variant)) {
              return e.resource.variant.map(v => v.variantType).filter(Boolean);
            }
            return [];
          });
          
        return {
          id: patient.id,
          name: patient.name && patient.name[0] ? 
                `${patient.name[0].given?.[0] || ''} ${patient.name[0].family || ''}`.trim() : 
                'Unknown',
          dob: patient.birthDate || 'Unknown',
          gender: patient.gender || 'Unknown',
          variants: variants.length > 0 ? variants : ['Unknown'],
          status: 'Active'
        };
      });
    
    res.json(patients);
  } catch (err) {
    console.error('Error fetching patients:', err);
    res.status(500).json({ error: 'Failed to retrieve patients' });
  }
});

// Delete a patient
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Read the current data
    const fileContent = await fs.readFile(
      path.join(__dirname, '../data/patients_FHIR.json'),
      'utf8'
    );
    const patientsData = JSON.parse(fileContent);
    
    // Find and remove the patient and all related resources
    const patientEntry = patientsData.entry.find(
      entry => entry.resource.resourceType === 'Patient' && entry.resource.id === id
    );
    
    if (!patientEntry) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    // Remove the patient and all related resources
    patientsData.entry = patientsData.entry.filter(entry => {
      if (entry.resource.resourceType === 'Patient' && entry.resource.id === id) {
        return false;
      }
      // Remove related resources (like MolecularSequence)
      if (entry.resource.patient?.reference === `Patient/${id}`) {
        return false;
      }
      return true;
    });
    
    // Save the updated data
    await fs.writeFile(
      path.join(__dirname, '../data/patients_FHIR.json'),
      JSON.stringify(patientsData, null, 2),
      'utf8'
    );
    
    res.json({ success: true, message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

module.exports = router; // This line is also important