// routes/patients.js
const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const router = express.Router(); // This line is missing in your code

// Upload new patient data
router.post('/upload', async (req, res) => {
  try {
    // Validate input
    const { patientData, apiKey, modelProvider } = req.body;
    
    if (!patientData || !Object.keys(patientData).length) {
      return res.status(400).json({ error: 'No patient data provided' });
    }
    
    // Read existing patients file
    const fileContent = await fs.readFile(path.join(__dirname, '../data/patients_FHIR.json'), 'utf8');
    const patientsData = JSON.parse(fileContent);
    
    // Handle both single resource and bundle formats
    let entriesToAdd = [];
    
    if (patientData.resourceType === 'Bundle' && Array.isArray(patientData.entry)) {
      // Bundle format
      entriesToAdd = patientData.entry;
    } else if (patientData.resourceType) {
      // Single resource format
      entriesToAdd = [{ resource: patientData }];
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

// Get a specific patient by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Read the current data
    const fileContent = await fs.readFile(
      path.join(__dirname, '../data/patients_FHIR.json'),
      'utf8'
    );
    const patientsData = JSON.parse(fileContent);
    
    // Find the patient
    const patientEntry = patientsData.entry.find(
      entry => entry.resource.resourceType === 'Patient' && entry.resource.id === id
    );
    
    if (!patientEntry) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const patient = patientEntry.resource;
    
    // Find related resources
    const molecularSequences = patientsData.entry
      .filter(e => 
        e.resource.resourceType === 'MolecularSequence' && 
        e.resource.patient?.reference === `Patient/${id}`
      );
    
    const observations = patientsData.entry
      .filter(e => 
        e.resource.resourceType === 'Observation' && 
        e.resource.subject?.reference === `Patient/${id}`
      );
    
    const conditions = patientsData.entry
      .filter(e => 
        e.resource.resourceType === 'Condition' && 
        e.resource.subject?.reference === `Patient/${id}`
      );
    
    const medications = patientsData.entry
      .filter(e => 
        e.resource.resourceType === 'MedicationStatement' && 
        e.resource.subject?.reference === `Patient/${id}`
      );
    
    // Extract variants from MolecularSequence resources
    const variants = molecularSequences.flatMap(ms => 
      ms.resource.variant?.map(v => v.variantType) || []
    );
    
    // Extract clinical observations
    const clinicalObservations = observations.map(obs => ({
      type: obs.resource.code?.text || 'Unknown',
      value: obs.resource.valueString || obs.resource.valueQuantity?.value + obs.resource.valueQuantity?.unit || 'Unknown'
    }));
    
    // Extract conditions
    const patientConditions = conditions.map(cond => ({
      type: cond.resource.code?.text || 'Unknown',
      status: cond.resource.clinicalStatus?.coding?.[0]?.code || 'Unknown',
      onset: cond.resource.onsetDateTime || 'Unknown'
    }));
    
    // Extract medications
    const patientMedications = medications.map(med => ({
      name: med.resource.medicationCodeableConcept?.text || 'Unknown',
      startDate: med.resource.effectiveDateTime || 'Unknown',
      notes: med.resource.note?.[0]?.text || 'None'
    }));
    
    // Generate summary and details
    const summary = generateGeneticSummary(variants, patientConditions);
    const details = generateClinicalDetails(clinicalObservations, patientConditions, patientMedications);
    
    // Prepare response
    const response = {
      id: patient.id,
      name: patient.name && patient.name[0] ? 
            `${patient.name[0].given?.[0] || ''} ${patient.name[0].family || ''}`.trim() : 
            'Unknown',
      dob: patient.birthDate || 'Unknown',
      gender: patient.gender || 'Unknown',
      variants: variants.length > 0 ? variants : ['Unknown'],
      clinicalObservations,
      conditions: patientConditions,
      medications: patientMedications,
      status: 'Active',
      summary,
      details
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to retrieve patient' });
  }
});

// Helper function to generate genetic summary
function generateGeneticSummary(variants, conditions) {
  if (!variants || variants.length === 0) {
    return 'No genetic analysis available.';
  }
  
  const isHomozygous = variants.length === 2 && variants[0] === variants[1];
  const variantInfo = variants.map(v => {
    const info = VARIANT_INFO[v] || {};
    return `${v} (${info.fullName || 'Unknown'}): ${info.description || 'No description available'}`;
  }).join('\n\n');
  
  return `Genetic Analysis:
Patient is ${isHomozygous ? 'homozygous' : 'heterozygous'} for the following CFTR variants:

${variantInfo}

Clinical Implications:
${conditions.map(c => `- ${c.type}: ${c.status}`).join('\n')}`;
}

// Helper function to generate clinical details
function generateClinicalDetails(observations, conditions, medications) {
  const sections = [];
  
  // Pulmonary Section
  const pulmonaryObs = observations.filter(o => 
    o.type.toLowerCase().includes('pulmonary') || 
    o.type.toLowerCase().includes('lung') || 
    o.type.toLowerCase().includes('respiratory')
  );
  
  if (pulmonaryObs.length > 0) {
    sections.push(`1. Pulmonary Management:
${pulmonaryObs.map(o => `- ${o.type}: ${o.value}`).join('\n')}`);
  }
  
  // Nutritional Section
  const nutritionalObs = observations.filter(o => 
    o.type.toLowerCase().includes('nutritional') || 
    o.type.toLowerCase().includes('nutrition') || 
    o.type.toLowerCase().includes('pancreatic')
  );
  
  if (nutritionalObs.length > 0) {
    sections.push(`2. Nutritional Management:
${nutritionalObs.map(o => `- ${o.type}: ${o.value}`).join('\n')}`);
  }
  
  // Therapy Section
  if (medications.length > 0) {
    sections.push(`3. Current Therapy:
${medications.map(m => `- ${m.name} (Started: ${m.startDate})${m.notes ? `\n  Note: ${m.notes}` : ''}`).join('\n')}`);
  }
  
  // Monitoring Section
  const monitoringObs = observations.filter(o => 
    o.type.toLowerCase().includes('monitoring') || 
    o.type.toLowerCase().includes('follow-up')
  );
  
  if (monitoringObs.length > 0) {
    sections.push(`4. Monitoring and Follow-up Recommendations:
${monitoringObs.map(o => `- ${o.type}: ${o.value}`).join('\n')}`);
  }
  
  return sections.join('\n\n');
}

// Variant information
const VARIANT_INFO = {
  'F508del': {
    fullName: 'c.1521_1523delCTT (p.Phe508del)',
    description: 'Most common CFTR mutation. Causes protein misfolding and degradation.',
    severity: 'high',
    prevalence: 'Found in ~70% of CF patients',
    modulator: 'Responsive to Elexacaftor/Tezacaftor/Ivacaftor or Lumacaftor/Ivacaftor'
  },
  'G551D': {
    fullName: 'c.1652G>A (p.Gly551Asp)',
    description: 'Gating mutation that affects channel opening.',
    severity: 'high',
    prevalence: 'Found in ~4% of CF patients',
    modulator: 'Highly responsive to Ivacaftor'
  },
  'R117H': {
    fullName: 'c.350G>A (p.Arg117His)',
    description: 'Conductance mutation that reduces chloride flow.',
    severity: 'mild to moderate',
    prevalence: 'Found in ~3% of CF patients',
    modulator: 'Responsive to Ivacaftor'
  },
  'G542X': {
    fullName: 'c.1624G>T (p.Gly542X)',
    description: 'Nonsense mutation resulting in premature termination.',
    severity: 'high',
    prevalence: 'Found in ~2.5% of CF patients',
    modulator: 'Potentially responsive to read-through agents'
  },
  'W1282X': {
    fullName: 'c.3846G>A (p.Trp1282X)',
    description: 'Nonsense mutation resulting in premature termination.',
    severity: 'high',
    prevalence: 'Common in Ashkenazi Jewish population',
    modulator: 'Potentially responsive to read-through agents'
  },
  'N1303K': {
    fullName: 'c.3909C>G (p.Asn1303Lys)',
    description: 'Processing mutation affecting protein folding.',
    severity: 'high',
    prevalence: 'Found in ~2% of CF patients',
    modulator: 'Partially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  '2789+5G>A': {
    fullName: 'c.2657+5G>A',
    description: 'Splicing mutation affecting mRNA processing.',
    severity: 'moderate',
    prevalence: 'More common in European populations',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  '621+1G>T': {
    fullName: 'c.489+1G>T',
    description: 'Splicing mutation affecting exon 4 processing.',
    severity: 'moderate to severe',
    prevalence: 'Found in ~1.5% of CF patients',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  '1717-1G>A': {
    fullName: 'c.1585-1G>A',
    description: 'Splicing mutation affecting exon 11 processing.',
    severity: 'moderate to severe',
    prevalence: 'Found in ~1% of CF patients',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  'R553X': {
    fullName: 'c.1657C>T (p.Arg553X)',
    description: 'Nonsense mutation resulting in premature termination.',
    severity: 'high',
    prevalence: 'Found in ~1% of CF patients',
    modulator: 'Potentially responsive to read-through agents'
  },
  '3849+10kbC>T': {
    fullName: 'c.3718-2477C>T',
    description: 'Splicing mutation creating a cryptic splice site.',
    severity: 'mild to moderate',
    prevalence: 'Found in ~1% of CF patients',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  'R560T': {
    fullName: 'c.1679G>C (p.Arg560Thr)',
    description: 'Missense mutation affecting protein function.',
    severity: 'moderate',
    prevalence: 'Found in ~0.5% of CF patients',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  'A455E': {
    fullName: 'c.1364C>A (p.Ala455Glu)',
    description: 'Missense mutation affecting protein function.',
    severity: 'mild to moderate',
    prevalence: 'Found in ~0.5% of CF patients',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  'S549N': {
    fullName: 'c.1646G>A (p.Ser549Asn)',
    description: 'Missense mutation affecting protein function.',
    severity: 'moderate',
    prevalence: 'Found in ~0.5% of CF patients',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  'R347P': {
    fullName: 'c.1040G>C (p.Arg347Pro)',
    description: 'Missense mutation affecting protein function.',
    severity: 'moderate',
    prevalence: 'Found in ~0.5% of CF patients',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  'R334W': {
    fullName: 'c.1000C>T (p.Arg334Trp)',
    description: 'Missense mutation affecting protein function.',
    severity: 'mild to moderate',
    prevalence: 'Found in ~0.5% of CF patients',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  '2184delA': {
    fullName: 'c.2052delA (p.Lys684Asnfs)',
    description: 'Frameshift mutation causing premature termination.',
    severity: 'high',
    prevalence: 'Found in ~0.5% of CF patients',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  }
};

module.exports = router; // This line is also important