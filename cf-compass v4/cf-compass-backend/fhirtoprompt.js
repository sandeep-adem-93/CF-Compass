// fhirToParagraph.js
/**
 * Converts a FHIR Bundle JSON to a readable paragraph
 * @param {Object} bundle - FHIR Bundle JSON object
 * @returns {string} Formatted paragraph with patient information
 */
function extractFhirBundleToParagraph(bundle) {
    // Initialize objects to store different resource types
    const patientInfo = {};
    const conditions = [];
    const observations = [];
    const medications = [];
    const procedures = [];
    const diagnosticReports = [];
    const molecularSequences = [];
    
    // Process each entry in the bundle
    (bundle.entry || []).forEach(entry => {
      const resource = entry.resource || {};
      const resourceType = resource.resourceType;
      
      switch(resourceType) {
        case "Patient":
          // Extract patient information
          patientInfo.id = resource.id || "";
          if (resource.name && resource.name.length > 0) {
            const name = resource.name[0];
            const given = (name.given && name.given.length > 0) ? name.given[0] : "";
            const family = name.family || "";
            patientInfo.name = `${given} ${family}`.trim();
          }
          patientInfo.gender = resource.gender || "";
          patientInfo.birthDate = resource.birthDate || "";
          break;
          
        case "Condition":
          // Extract condition information
          const codeText = resource.code?.text || "";
          const clinicalStatus = resource.clinicalStatus?.coding?.[0]?.code || "";
          conditions.push({ text: codeText, status: clinicalStatus });
          break;
          
        case "Observation":
          // Extract observation information
          const obsCodeText = resource.code?.text || "";
          const valueString = resource.valueString || "";
          const valueQuantity = resource.valueQuantity?.value || "";
          const value = valueString || valueQuantity;
          observations.push({ text: obsCodeText, value });
          break;
          
        case "MedicationStatement":
        case "MedicationRequest":
          // Extract medication information
          const medName = resource.medicationCodeableConcept?.text || "";
          if (medName) medications.push(medName);
          break;
          
        case "Procedure":
          // Extract procedure information
          const procedureName = resource.code?.text || "";
          if (procedureName) procedures.push(procedureName);
          break;
          
        case "DiagnosticReport":
          // Extract diagnostic report information
          const reportName = resource.code?.text || "";
          const conclusion = resource.conclusion || "";
          diagnosticReports.push({ name: reportName, conclusion });
          break;
          
        case "MolecularSequence":
          // Extract genetic information
          const variants = [];
          (resource.variant || []).forEach(variant => {
            const gene = variant.gene || "";
            const variantType = variant.variantType || "";
            variants.push({ gene, type: variantType });
          });
          molecularSequences.push({ type: resource.type || "", variants });
          break;
      }
    });
    
    // Calculate age from birthdate if available
    let age = "";
    if (patientInfo.birthDate) {
      try {
        const birthDate = new Date(patientInfo.birthDate);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        
        // Adjust age if birthday hasn't occurred yet this year
        if (
          today.getMonth() < birthDate.getMonth() || 
          (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
        ) {
          age--;
        }
      } catch (e) {
        age = "";
      }
    }
    
    // Build the paragraph
    let paragraph = "";
    
    // Patient information
    if (patientInfo.name) {
      paragraph += `Patient ${patientInfo.name}`;
      if (age) {
        paragraph += `, a ${age}-year-old ${patientInfo.gender}`;
      }
    }
    
    // Conditions
    const activeConditions = conditions
      .filter(c => c.status === "active")
      .map(c => c.text);
      
    if (activeConditions.length > 0) {
      paragraph += `, has been diagnosed with ${activeConditions.join(", ")}`;
    }
    
    // Genetic information
    for (const seq of molecularSequences) {
      if (seq.type === "dna" && seq.variants.length > 0) {
        // Group identical variants
        const variantCounts = {};
        
        for (const variant of seq.variants) {
          const key = `${variant.gene} ${variant.type}`;
          variantCounts[key] = (variantCounts[key] || 0) + 1;
        }
        
        const variantDescriptions = [];
        
        for (const [key, count] of Object.entries(variantCounts)) {
          const [gene, varType] = key.split(" ", 2);
          const zygosity = count > 1 ? "homozygous" : "heterozygous";
          variantDescriptions.push(`${zygosity} for ${varType} mutation in ${gene} gene`);
        }
        
        if (variantDescriptions.length > 0) {
          paragraph += `. Genetic testing shows patient is ${variantDescriptions.join(", ")}`;
        }
      }
    }
    
    // Symptoms (observations)
    const symptoms = observations.filter(o => 
      o.text.toLowerCase().includes("symptoms") || 
      o.text.toLowerCase().includes("disease")
    );
    
    if (symptoms.length > 0) {
      const symptomTexts = symptoms.map(s => `${s.text} (${s.value})`);
      paragraph += `. Patient exhibits ${symptomTexts.join(", ")}`;
    }
    
    // Test results
    const testResults = observations.filter(o => 
      !o.text.toLowerCase().includes("symptoms") && 
      !o.text.toLowerCase().includes("disease")
    );
    
    if (testResults.length > 0) {
      const resultTexts = testResults.map(t => `${t.text}: ${t.value}`);
      paragraph += `. Test results include ${resultTexts.join(", ")}`;
    }
    
    // Diagnostic reports
    if (diagnosticReports.length > 0) {
      const reportTexts = diagnosticReports.map(r => `${r.name} showing ${r.conclusion}`);
      paragraph += `. Diagnostic reports include ${reportTexts.join(", ")}`;
    }
    
    // Medications
    if (medications.length > 0) {
      paragraph += `. Current medications include ${medications.join(", ")}`;
    }
    
    // Procedures
    if (procedures.length > 0) {
      paragraph += `. Patient has undergone ${procedures.join(", ")}`;
    }
    
    // Clean up the paragraph
    paragraph = paragraph
      .replace(/\s{2,}/g, " ")
      .replace(/ \./g, ".")
      .replace(/,\./g, ".");
      
    if (paragraph.endsWith(",")) {
      paragraph = paragraph.slice(0, -1) + ".";
    }
    
    if (!paragraph.endsWith(".")) {
      paragraph += ".";
    }
    
    return paragraph;
  }
  
  /**
   * Process a FHIR JSON string
   * @param {string} jsonStr - FHIR Bundle JSON string
   * @returns {string} Formatted paragraph or error message
   */
  function processFhirJsonFile(jsonStr) {
    try {
      const bundle = JSON.parse(jsonStr);
      return extractFhirBundleToParagraph(bundle);
    } catch (error) {
      return `Error processing FHIR JSON: ${error.message}`;
    }
  }
  
  module.exports = {
    extractFhirBundleToParagraph,
    processFhirJsonFile
  };