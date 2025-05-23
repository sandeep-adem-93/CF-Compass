// // fhirToParagraph.js
// /**
//  * Converts a FHIR Bundle JSON to a readable paragraph
//  * @param {Object} bundle - FHIR Bundle JSON object
//  * @returns {string} Formatted paragraph with patient information
//  */
// function extractFhirBundleToParagraph(bundle) {
//     // Initialize objects to store different resource types
//     const patientInfo = {};
//     const conditions = [];
//     const observations = [];
//     const medications = [];
//     const procedures = [];
//     const diagnosticReports = [];
//     const molecularSequences = [];
    
//     // Process each entry in the bundle
//     (bundle.entry || []).forEach(entry => {
//       const resource = entry.resource || {};
//       const resourceType = resource.resourceType;
      
//       switch(resourceType) {
//         case "Patient":
//           // Extract patient information
//           patientInfo.id = resource.id || "";
//           if (resource.name && resource.name.length > 0) {
//             const name = resource.name[0];
//             const given = (name.given && name.given.length > 0) ? name.given[0] : "";
//             const family = name.family || "";
//             patientInfo.name = `${given} ${family}`.trim();
//           }
//           patientInfo.gender = resource.gender || "";
//           patientInfo.birthDate = resource.birthDate || "";
//           break;
          
//         case "Condition":
//           // Extract condition information
//           const codeText = resource.code?.text || "";
//           const clinicalStatus = resource.clinicalStatus?.coding?.[0]?.code || "";
//           conditions.push({ text: codeText, status: clinicalStatus });
//           break;
          
//         case "Observation":
//           // Extract observation information
//           const obsCodeText = resource.code?.text || "";
//           const valueString = resource.valueString || "";
//           const valueQuantity = resource.valueQuantity?.value || "";
//           const value = valueString || valueQuantity;
//           observations.push({ text: obsCodeText, value });
//           break;
          
//         case "MedicationStatement":
//         case "MedicationRequest":
//           // Extract medication information
//           const medName = resource.medicationCodeableConcept?.text || "";
//           if (medName) medications.push(medName);
//           break;
          
//         case "Procedure":
//           // Extract procedure information
//           const procedureName = resource.code?.text || "";
//           if (procedureName) procedures.push(procedureName);
//           break;
          
//         case "DiagnosticReport":
//           // Extract diagnostic report information
//           const reportName = resource.code?.text || "";
//           const conclusion = resource.conclusion || "";
//           diagnosticReports.push({ name: reportName, conclusion });
//           break;
          
//         case "MolecularSequence":
//           // Extract genetic information
//           const variants = [];
//           (resource.variant || []).forEach(variant => {
//             const gene = variant.gene || "";
//             const variantType = variant.variantType || "";
//             variants.push({ gene, type: variantType });
//           });
//           molecularSequences.push({ type: resource.type || "", variants });
//           break;
//       }
//     });
    
//     // Calculate age from birthdate if available
//     let age = "";
//     if (patientInfo.birthDate) {
//       try {
//         const birthDate = new Date(patientInfo.birthDate);
//         const today = new Date();
//         age = today.getFullYear() - birthDate.getFullYear();
        
//         // Adjust age if birthday hasn't occurred yet this year
//         if (
//           today.getMonth() < birthDate.getMonth() || 
//           (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
//         ) {
//           age--;
//         }
//       } catch (e) {
//         age = "";
//       }
//     }
    
//     // Build the paragraph
//     let paragraph = "";
    
//     // Patient information
//     if (patientInfo.name) {
//       paragraph += `Patient ${patientInfo.name}`;
//       if (age) {
//         paragraph += `, a ${age}-year-old ${patientInfo.gender}`;
//       }
//     }
    
//     // Conditions
//     const activeConditions = conditions
//       .filter(c => c.status === "active")
//       .map(c => c.text);
      
//     if (activeConditions.length > 0) {
//       paragraph += `, has been diagnosed with ${activeConditions.join(", ")}`;
//     }
    
//     // Genetic information
//     for (const seq of molecularSequences) {
//       if (seq.type === "dna" && seq.variants.length > 0) {
//         // Group identical variants
//         const variantCounts = {};
        
//         for (const variant of seq.variants) {
//           const key = `${variant.gene} ${variant.type}`;
//           variantCounts[key] = (variantCounts[key] || 0) + 1;
//         }
        
//         const variantDescriptions = [];
        
//         for (const [key, count] of Object.entries(variantCounts)) {
//           const [gene, varType] = key.split(" ", 2);
//           const zygosity = count > 1 ? "homozygous" : "heterozygous";
//           variantDescriptions.push(`${zygosity} for ${varType} mutation in ${gene} gene`);
//         }
        
//         if (variantDescriptions.length > 0) {
//           paragraph += `. Genetic testing shows patient is ${variantDescriptions.join(", ")}`;
//         }
//       }
//     }
    
//     // Symptoms (observations)
//     const symptoms = observations.filter(o => 
//       o.text.toLowerCase().includes("symptoms") || 
//       o.text.toLowerCase().includes("disease")
//     );
    
//     if (symptoms.length > 0) {
//       const symptomTexts = symptoms.map(s => `${s.text} (${s.value})`);
//       paragraph += `. Patient exhibits ${symptomTexts.join(", ")}`;
//     }
    
//     // Test results
//     const testResults = observations.filter(o => 
//       !o.text.toLowerCase().includes("symptoms") && 
//       !o.text.toLowerCase().includes("disease")
//     );
    
//     if (testResults.length > 0) {
//       const resultTexts = testResults.map(t => `${t.text}: ${t.value}`);
//       paragraph += `. Test results include ${resultTexts.join(", ")}`;
//     }
    
//     // Diagnostic reports
//     if (diagnosticReports.length > 0) {
//       const reportTexts = diagnosticReports.map(r => `${r.name} showing ${r.conclusion}`);
//       paragraph += `. Diagnostic reports include ${reportTexts.join(", ")}`;
//     }
    
//     // Medications
//     if (medications.length > 0) {
//       paragraph += `. Current medications include ${medications.join(", ")}`;
//     }
    
//     // Procedures
//     if (procedures.length > 0) {
//       paragraph += `. Patient has undergone ${procedures.join(", ")}`;
//     }
    
//     // Clean up the paragraph
//     paragraph = paragraph
//       .replace(/\s{2,}/g, " ")
//       .replace(/ \./g, ".")
//       .replace(/,\./g, ".");
      
//     if (paragraph.endsWith(",")) {
//       paragraph = paragraph.slice(0, -1) + ".";
//     }
    
//     if (!paragraph.endsWith(".")) {
//       paragraph += ".";
//     }
    
//     return paragraph;
//   }
  
//   /**
//    * Process a FHIR JSON string
//    * @param {string} jsonStr - FHIR Bundle JSON string
//    * @returns {string} Formatted paragraph or error message
//    */
//   async function processFhirJsonFile(jsonData, apiKey, modelProvider) {
//     try {
//       console.log('=== Processing FHIR JSON ===');
      
//       // Validate inputs
//       if (!jsonData || typeof jsonData !== 'object') {
//         throw new Error('Invalid FHIR JSON data');
//       }
      
//       if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
//         throw new Error('Valid API key is required for processing');
//       }
      
//       if (!modelProvider || typeof modelProvider !== 'string') {
//         throw new Error('Valid model provider is required');
//       }
      
//       // Extract patient information from the FHIR Bundle
//       const patientResource = jsonData.entry?.find(e => e.resource?.resourceType === 'Patient')?.resource;
//       if (!patientResource) {
//         throw new Error('No patient resource found in FHIR Bundle');
//       }
      
//       // Format patient name
//       let formattedName = 'Unknown';
//       if (patientResource.name && patientResource.name.length > 0) {
//         const nameObj = patientResource.name[0];
//         // Try different name formats
//         if (nameObj.given && nameObj.family) {
//           // Format: given + family
//           formattedName = `${nameObj.given[0]} ${nameObj.family}`;
//         } else if (nameObj.text) {
//           // Format: text field
//           formattedName = nameObj.text;
//         } else if (nameObj.given) {
//           // Format: only given name
//           formattedName = nameObj.given[0];
//         } else if (nameObj.family) {
//           // Format: only family name
//           formattedName = nameObj.family;
//         }
//       }
      
//       // Extract genetic information
//       const molecularSequence = jsonData.entry?.find(e => e.resource?.resourceType === 'MolecularSequence')?.resource;
//       const variants = molecularSequence?.variant?.map(v => v.variantType) || [];
      
//       // Extract clinical details
//       const clinicalDetails = [];
//       (jsonData.entry || []).forEach(entry => {
//         const resource = entry.resource || {};
        
//         if (resource.resourceType === 'Condition' && resource.code?.text) {
//           clinicalDetails.push({
//             type: 'condition',
//             text: resource.code.text,
//             status: resource.clinicalStatus?.coding?.[0]?.code || 'unknown'
//           });
//         }
        
//         if (resource.resourceType === 'Observation' && resource.code?.text) {
//           clinicalDetails.push({
//             type: 'observation',
//             text: resource.code.text,
//             value: resource.valueString || resource.valueQuantity?.value || 'unknown'
//           });
//         }
//       });
      
//       // Create patient object with required fields
//       const patient = {
//         resourceType: 'Patient',
//         id: patientResource.id || `cf_patient_${Date.now()}`,
//         name: formattedName,
//         gender: patientResource.gender || 'unknown',
//         birthDate: patientResource.birthDate,
//         variants: variants,
//         geneticSummary: '', // Will be updated by LLM analysis
//         clinicalDetails: clinicalDetails,
//         analysisProvider: modelProvider,
//         status: 'Active'
//       };
      
//       console.log('Processed patient:', {
//         id: patient.id,
//         name: patient.name,
//         gender: patient.gender,
//         birthDate: patient.birthDate,
//         variantsCount: patient.variants.length,
//         variants: patient.variants,
//         clinicalDetailsCount: patient.clinicalDetails.length
//       });
      
//       return patient;
//     } catch (error) {
//       console.error('Error processing FHIR JSON:', error);
//       throw new Error(`Failed to process FHIR data: ${error.message}`);
//     }
//   }
  
//   module.exports = {
//     extractFhirBundleToParagraph,
//     processFhirJsonFile
//   };


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
            if (variant.variantType) {
              variants.push(variant.variantType);
            }
          });
          if (variants.length > 0) {
            molecularSequences.push({
              type: resource.type || "dna",
              variants: variants
            });
          }
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
        console.log('\n=== PATIENT GENETIC INFORMATION ===');
        console.log('Raw variants:', JSON.stringify(seq.variants, null, 2));
        
        // Extract variant types from the variant objects
        const variantTypes = seq.variants.map(v => v.variantType).filter(Boolean);
        console.log('Extracted variant types:', variantTypes);
        
        // Group identical variants
        const variantCounts = {};
        
        for (const variantType of variantTypes) {
          variantCounts[variantType] = (variantCounts[variantType] || 0) + 1;
        }
        console.log('Variant counts:', variantCounts);
        
        const variantDescriptions = [];
        
        // Check if we have compound heterozygous mutations
        if (Object.keys(variantCounts).length > 1) {
          const mutations = Object.keys(variantCounts);
          variantDescriptions.push(`compound heterozygous for ${mutations.join(" and ")} mutations`);
          console.log('Compound heterozygous detected:', mutations);
        } else {
          // Handle homozygous or single variant cases
          for (const [variantType, count] of Object.entries(variantCounts)) {
            const zygosity = count > 1 ? "homozygous" : "heterozygous";
            variantDescriptions.push(`${zygosity} for ${variantType} mutation`);
            console.log(`${zygosity} variant detected:`, variantType);
          }
        }
        
        if (variantDescriptions.length > 0) {
          const geneticInfo = `Genetic testing shows patient is ${variantDescriptions.join(", ")}`;
          console.log('Final genetic information:', geneticInfo);
          paragraph += `. ${geneticInfo}`;
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
  async function processFhirJsonFile(jsonData, apiKey, modelProvider) {
    try {
      console.log('=== Processing FHIR JSON ===');
      
      // Validate inputs
      if (!jsonData || typeof jsonData !== 'object') {
        throw new Error('Invalid FHIR JSON data');
      }
      
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        throw new Error('Valid API key is required for processing');
      }
      
      if (!modelProvider || typeof modelProvider !== 'string') {
        throw new Error('Valid model provider is required');
      }
      
      // Extract patient information from the FHIR Bundle
      const patientResource = jsonData.entry?.find(e => e.resource?.resourceType === 'Patient')?.resource;
      if (!patientResource) {
        throw new Error('No patient resource found in FHIR Bundle');
      }
      
      // Format patient name
      let formattedName = 'Unknown';
      if (patientResource.name && patientResource.name.length > 0) {
        const nameObj = patientResource.name[0];
        if (nameObj.given && nameObj.family) {
          formattedName = `${nameObj.given[0]} ${nameObj.family}`;
        } else if (nameObj.text) {
          formattedName = nameObj.text;
        }
      }
      
      // Extract genetic information
      const molecularSequence = jsonData.entry?.find(e => e.resource?.resourceType === 'MolecularSequence')?.resource;
      const variants = molecularSequence?.variant?.map(v => v.variantType) || [];
      
      // Extract clinical details
      const clinicalDetails = [];
      (jsonData.entry || []).forEach(entry => {
        const resource = entry.resource || {};
        
        if (resource.resourceType === 'Condition' && resource.code?.text) {
          clinicalDetails.push({
            type: 'condition',
            text: resource.code.text,
            status: resource.clinicalStatus?.coding?.[0]?.code || 'unknown'
          });
        }
        
        if (resource.resourceType === 'Observation' && resource.code?.text) {
          clinicalDetails.push({
            type: 'observation',
            text: resource.code.text,
            value: resource.valueString || resource.valueQuantity?.value || 'unknown'
          });
        }
      });
      
      // Create patient object with required fields
      const patient = {
        resourceType: 'Patient',
        id: patientResource.id || `cf_patient_${Date.now()}`,
        name: formattedName,
        gender: patientResource.gender || 'unknown',
        birthDate: patientResource.birthDate || '',
        variants: variants,
        geneticSummary: '', // Will be updated by LLM analysis
        clinicalDetails: clinicalDetails,
        analysisProvider: modelProvider,
        status: 'Active'
      };
      
      console.log('\n=== PATIENT GENETIC INFORMATION ===');
      console.log('Processed patient:', {
        id: patient.id,
        name: patient.name,
        gender: patient.gender,
        birthDate: patient.birthDate,
        variantsCount: patient.variants.length,
        variants: patient.variants,
        clinicalDetailsCount: patient.clinicalDetails.length
      });
      console.log('=== END GENETIC INFORMATION ===\n');
      
      return patient;
    } catch (error) {
      console.error('Error processing FHIR JSON:', error);
      throw new Error(`Failed to process FHIR data: ${error.message}`);
    }
  }
  
  module.exports = {
    extractFhirBundleToParagraph,
    processFhirJsonFile
  };