import axios from 'axios';

/**
 * Generates and downloads a random cystic fibrosis patient FHIR bundle
 * @param {string} apiKey - API key for the selected provider
 * @param {string} provider - The AI provider to use ('gemini', 'openai', or 'anthropic')
 * @returns {Promise<object>} - The generated FHIR bundle
 */
export const generateCFPatient = async (apiKey, provider = 'gemini') => {
  try {
    // Validate API key
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      throw new Error('Invalid or missing API key');
    }

    // Generate random patient parameters
    const randomPatient = generateRandomPatientParams();
    
    // Generate FHIR bundle using the selected provider
    let fhirBundle;
    switch (provider.toLowerCase()) {
      case 'gemini':
        fhirBundle = await generateWithGemini(apiKey, randomPatient);
        break;
      case 'openai':
        fhirBundle = await generateWithOpenAI(apiKey, randomPatient);
        break;
      case 'anthropic':
        fhirBundle = await generateWithAnthropic(apiKey, randomPatient);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
    
    // Ensure variants are normalized before returning
    fhirBundle = normalizeVariants(fhirBundle);
    
    // Download the generated JSON
    downloadJson(fhirBundle, randomPatient.lastName, randomPatient.firstName);
    
    return fhirBundle;
  } catch (error) {
    console.error('Error generating CF patient data:', error);
    throw error;
  }
};

/**
 * Normalizes variants to ensure they are in the correct format (array of strings)
 * @param {object} fhirBundle - The FHIR bundle to normalize
 * @returns {object} Normalized FHIR bundle
 */
const normalizeVariants = (fhirBundle) => {
  try {
    // Find the MolecularSequence resource
    const molecularSequence = fhirBundle.entry.find(entry => 
      entry.resource.resourceType === 'MolecularSequence'
    );

    if (molecularSequence && molecularSequence.resource.variants) {
      let variants = molecularSequence.resource.variants;

      // If variants is a string, try to parse it
      if (typeof variants === 'string') {
        try {
          variants = JSON.parse(variants);
        } catch (e) {
          console.error('Failed to parse variants string:', e);
          return fhirBundle;
        }
      }

      // If variants is an array of objects with text property, extract the text values
      if (Array.isArray(variants) && variants.length > 0) {
        if (typeof variants[0] === 'object' && 'text' in variants[0]) {
          variants = variants.map(v => v.text);
        }
        // If variants is an array of strings, ensure they are properly formatted
        else if (typeof variants[0] === 'string') {
          variants = variants.map(v => v.trim());
        }
      }

      // Validate the variants
      if (!Array.isArray(variants) || variants.length === 0) {
        console.error('Invalid variants format after normalization');
        return fhirBundle;
      }

      // Ensure all variants are strings
      variants = variants.filter(v => typeof v === 'string' && v.trim().length > 0);

      // Update the variants in the MolecularSequence resource
      molecularSequence.resource.variants = variants;
    }

    return fhirBundle;
  } catch (error) {
    console.error('Error normalizing variants:', error);
    return fhirBundle;
  }
};

/**
 * Generates a CF patient FHIR bundle using Gemini API
 * @param {string} apiKey - Gemini API key
 * @param {object} patientParams - Patient parameters
 * @returns {Promise<object>} FHIR bundle JSON
 */
const generateWithGemini = async (apiKey, patientParams) => {
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';
  
  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${apiKey}`,
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: constructCFPatientPrompt(patientParams)
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const responseText = response.data.candidates[0].content.parts[0].text;
    const fhirBundle = extractJsonFromResponse(responseText);
    
    // Normalize variants before returning
    return normalizeVariants(fhirBundle);
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    
    if (error.response) {
      throw new Error(`Gemini API error: ${error.response.status} - ${JSON.stringify(error.response.data) || 'Unknown error'}`);
    }
    
    throw error;
  }
};

/**
 * Generates a CF patient FHIR bundle using OpenAI API
 */
const generateWithOpenAI = async (apiKey, patientParams) => {
  const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
  
  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "user",
            content: constructCFPatientPrompt(patientParams)
          }
        ],
        temperature: 0.2,
        max_tokens: 4000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    const responseText = response.data.choices[0].message.content;
    const fhirBundle = extractJsonFromResponse(responseText);
    
    // Normalize variants before returning
    return normalizeVariants(fhirBundle);
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
};

/**
 * Generates a CF patient FHIR bundle using Anthropic API
 */
const generateWithAnthropic = async (apiKey, patientParams) => {
  const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
  
  try {
    const response = await axios.post(
      ANTHROPIC_API_URL,
      {
        model: "claude-3-opus-20240229",
        max_tokens: 4000,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: constructCFPatientPrompt(patientParams)
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    const responseText = response.data.content[0].text;
    const fhirBundle = extractJsonFromResponse(responseText);
    
    // Normalize variants before returning
    return normalizeVariants(fhirBundle);
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    throw error;
  }
};

/**
 * Generates random patient parameters for a CF patient
 * @returns {object} Random patient parameters
 */
const generateRandomPatientParams = () => {
  // Arrays of common first and last names
  const firstNames = [
    'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'James',
    'Isabella', 'Logan', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Mia',
    'Mason', 'Harper', 'Ethan', 'Evelyn', 'Michael', 'Abigail', 'Alexander',
    'Emily', 'Daniel', 'Elizabeth', 'Matthew', 'Sofia', 'Elijah', 'Ella'
  ];
  
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson',
    'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin',
    'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis',
    'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'Hernandez', 'King', 'Wright'
  ];
  
  // Common CFTR mutations with their specific details
  const cftrMutations = [
    {
      name: 'F508del',
      start: 117199646,
      end: 117199648,
      observedAllele: 'del',
      referenceAllele: 'CTT',
      variantType: 'F508del'
    },
    {
      name: 'G542X',
      start: 117282360,
      end: 117282360,
      observedAllele: 'T',
      referenceAllele: 'G',
      variantType: 'G542X'
    },
    {
      name: 'G551D',
      start: 117199646,
      end: 117199646,
      observedAllele: 'A',
      referenceAllele: 'G',
      variantType: 'G551D'
    },
    {
      name: 'N1303K',
      start: 117282360,
      end: 117282360,
      observedAllele: 'A',
      referenceAllele: 'C',
      variantType: 'N1303K'
    },
    {
      name: 'W1282X',
      start: 117282360,
      end: 117282360,
      observedAllele: 'G',
      referenceAllele: 'A',
      variantType: 'W1282X'
    },
    {
      name: 'R117H',
      start: 117199646,
      end: 117199646,
      observedAllele: 'A',
      referenceAllele: 'G',
      variantType: 'R117H'
    },
    {
      name: '621+1G>T',
      start: 117199646,
      end: 117199646,
      observedAllele: 'T',
      referenceAllele: 'G',
      variantType: '621+1G>T'
    },
    {
      name: '1717-1G>A',
      start: 117282360,
      end: 117282360,
      observedAllele: 'A',
      referenceAllele: 'G',
      variantType: '1717-1G>A'
    },
    {
      name: 'R553X',
      start: 117199646,
      end: 117199646,
      observedAllele: 'T',
      referenceAllele: 'C',
      variantType: 'R553X'
    },
    {
      name: '3849+10kbC>T',
      start: 117282360,
      end: 117282360,
      observedAllele: 'T',
      referenceAllele: 'C',
      variantType: '3849+10kbC>T'
    },
    {
      name: '2789+5G>A',
      start: 117199646,
      end: 117199646,
      observedAllele: 'A',
      referenceAllele: 'G',
      variantType: '2789+5G>A'
    }
  ];
  
  // Generate a random birth year (between 1-40 years ago)
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - Math.floor(Math.random() * 40) - 1;
  const birthMonth = Math.floor(Math.random() * 12) + 1;
  const birthDay = Math.floor(Math.random() * 28) + 1;
  
  // Generate random sex
  const genders = ['male', 'female', 'other', 'unknown', 'non-binary'];
  const gender = genders[Math.floor(Math.random() * genders.length)];
  
  // Generate a random severity level
  const severities = ['mild', 'moderate', 'severe'];
  const severity = severities[Math.floor(Math.random() * severities.length)];
  
  // Generate random FEV1 value based on severity
  let fev1;
  switch (severity) {
    case 'mild':
      fev1 = 70 + Math.floor(Math.random() * 20); // 70-90%
      break;
    case 'moderate':
      fev1 = 40 + Math.floor(Math.random() * 30); // 40-70%
      break;
    case 'severe':
      fev1 = 20 + Math.floor(Math.random() * 20); // 20-40%
      break;
    default:
      fev1 = 50;
  }
  
  // Select random mutations
  const getRandomMutation = () => cftrMutations[Math.floor(Math.random() * cftrMutations.length)];
  const mutation1 = getRandomMutation();
  // Make sure second mutation is different
  let mutation2;
  do {
    mutation2 = getRandomMutation();
  } while (mutation2.name === mutation1.name);
  
  // Common CF symptoms
  const commonSymptoms = [
    'chronic sinusitis',
    'recurrent lung infections',
    'bronchiectasis',
    'pancreatic insufficiency',
    'poor weight gain',
    'meconium ileus',
    'nasal polyps',
    'chronic cough',
    'shortness of breath',
    'salty-tasting skin',
    'male infertility',
    'CFRD (CF-related diabetes)'
  ];
  
  // Select 3-5 random symptoms
  const numSymptoms = Math.floor(Math.random() * 3) + 3;
  const shuffledSymptoms = [...commonSymptoms].sort(() => 0.5 - Math.random());
  const selectedSymptoms = shuffledSymptoms.slice(0, numSymptoms);
  
  // Common CF medications
  const medications = [
    'Ivacaftor (Kalydeco)',
    'Lumacaftor/Ivacaftor (Orkambi)',
    'Tezacaftor/Ivacaftor (Symdeko)',
    'Elexacaftor/Tezacaftor/Ivacaftor (Trikafta)',
    'Pancrelipase (Creon)',
    'Azithromycin',
    'Tobramycin inhalation',
    'Dornase alfa (Pulmozyme)',
    'Hypertonic saline'
  ];
  
  // Based on mutation and severity, select appropriate medications
  let selectedMeds = ['Pancrelipase (Creon)']; // Most CF patients will be on enzymes
  
  // Add CFTR modulator based on mutations
  if (mutation1.name === 'F508del' || mutation2.name === 'F508del') {
    if (mutation1.name === 'F508del' && mutation2.name === 'F508del') {
      // Homozygous F508del
      selectedMeds.push('Elexacaftor/Tezacaftor/Ivacaftor (Trikafta)');
    } else if (mutation1.name === 'G551D' || mutation2.name === 'G551D') {
      // F508del + G551D
      selectedMeds.push('Ivacaftor (Kalydeco)');
    } else {
      // F508del + other
      selectedMeds.push('Elexacaftor/Tezacaftor/Ivacaftor (Trikafta)');
    }
  } else if (mutation1.name === 'G551D' || mutation2.name === 'G551D') {
    selectedMeds.push('Ivacaftor (Kalydeco)');
  }
  
  // Add other medications based on severity
  if (severity === 'moderate' || severity === 'severe') {
    selectedMeds.push('Dornase alfa (Pulmozyme)');
    selectedMeds.push('Hypertonic saline');
  }
  
  if (severity === 'severe') {
    selectedMeds.push('Azithromycin');
    selectedMeds.push('Tobramycin inhalation');
  }
  
  return {
    firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
    lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
    gender: gender,
    birthDate: `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`,
    mutations: [mutation1, mutation2],
    symptoms: selectedSymptoms,
    medications: selectedMeds,
    severity: severity,
    fev1: fev1,
    sweatChloride: severity === 'mild' ? 60 + Math.floor(Math.random() * 20) : // 60-80 mmol/L
                   severity === 'moderate' ? 80 + Math.floor(Math.random() * 20) : // 80-100 mmol/L
                   100 + Math.floor(Math.random() * 20) // 100-120 mmol/L
  };
};

/**
 * Constructs a detailed prompt for generating comprehensive CF patient data
 * @param {object} params - Patient parameters
 * @returns {string} Prompt for model
 */
const constructCFPatientPrompt = (params) => {
  // Generate a unique timestamp-based ID
  const timestamp = new Date().getTime();
  const randomSuffix = Math.floor(Math.random() * 1000);
  const uniqueId = `CF${timestamp}${randomSuffix}`;

  return `Generate a comprehensive FHIR bundle for a cystic fibrosis patient with these parameters:
${JSON.stringify(params, null, 2)}

Create a complete R4 FHIR bundle of type "collection" with the following resources:

1. Patient resource with:
   - Unique ID: "${uniqueId}"
   - Name (official use)
   - Gender
   - Birth date

2. Condition resource for cystic fibrosis with:
   - SNOMED code 190905008
   - Active clinical status
   - Confirmed verification status
   - Onset date

3. MolecularSequence resource with:
   - CFTR gene mutations (specifically list the mutations like F508del, G542X, etc.)
   - Reference sequence
   - Variant information including:
     - start/end positions
     - observedAllele
     - referenceAllele
     - gene
     - variantType (specific mutation name)
   - variants: MUST be an array of strings containing ONLY the mutation names (e.g., ["F508del", "G542X"])
     WARNING: Do NOT use objects with text properties. The variants must be a simple array of strings.

4. Multiple Observation resources for:
   - CFTR gene mutation analysis (with specific mutation names)
   - Sweat chloride test results
   - FEV1 lung function
   - Other relevant symptoms

5. MedicationStatement resources for:
   - CFTR modulator therapy
   - Pancreatic enzymes
   - Other medications

6. DiagnosticReport resources for:
   - Sweat chloride test
   - Other relevant tests

7. CarePlan resources for:
   - Pulmonary Management (airway clearance, inhaled medications, exercise)
   - Pancreatic/Nutritional Management (enzyme replacement, nutritional supplements)
   - CFTR Modulator Therapy Considerations
   - Monitoring and Follow-up Recommendations

Important requirements:
- All resources must reference the patient using "Patient/[ID]"
- Use proper FHIR coding systems (SNOMED, LOINC)
- Include realistic clinical values
- All dates should be in YYYY-MM-DD format
- Make all IDs unique and follow a consistent pattern
- Include appropriate meta.lastUpdated timestamps
- For genetic variants, use specific mutation names (e.g., F508del, G542X, 2789+5G>A)
- Include all four management sections in the CarePlan

Respond ONLY with the valid FHIR JSON without any explanations or markdown formatting.`;
};

/**
 * Extracts JSON from model text response
 * @param {string} responseText - Text response
 * @returns {object} Parsed JSON
 */
const extractJsonFromResponse = (responseText) => {
  // Remove any markdown code block formatting if present
  let cleanedText = responseText.replace(/```json|```/g, '').trim();
  
  // Extract JSON using regex
  const jsonRegex = /{[\s\S]*}/;
  const match = cleanedText.match(jsonRegex);
  
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (e) {
      throw new Error('Failed to parse JSON from response');
    }
  }
  
  throw new Error('No JSON found in response');
};

/**
 * Downloads JSON data as a file
 * @param {object} data - JSON data to download
 * @param {string} lastName - Patient's last name
 * @param {string} firstName - Patient's first name
 */
const downloadJson = (data, lastName, firstName) => {
  // Format the data as pretty-printed JSON
  const dataStr = JSON.stringify(data, null, 2);
  
  // Create a blob and download link
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const filename = `cf_patient_${lastName.toLowerCase()}_${firstName.toLowerCase()}.json`;
  
  // Create and trigger a download link
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}; 