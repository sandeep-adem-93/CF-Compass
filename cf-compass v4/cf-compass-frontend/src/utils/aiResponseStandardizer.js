// src/utils/aiResponseStandardizer.js

/**
 * Standardizes responses from different AI providers to ensure consistent format
 * @param {string} rawText - The raw text response from the AI provider
 * @param {string} provider - The AI provider name ('gemini', 'openai', 'anthropic')
 * @returns {object} - Standardized response with genetic and clinical sections
 */
export const standardizeAIResponse = (rawText, provider = 'unknown') => {
    // Initialize the standardized structure
    const standardized = {
      geneticAnalysis: '',
      clinicalDetails: '',
      provider
    };
    
    // Skip processing if no text is provided
    if (!rawText) {
      return standardized;
    }
    
    try {
      // Remove any AI-specific prefixes or formatting
      let cleanedText = rawText
        .replace(/^(Here is my analysis:|I'll analyze this patient for you:|Based on the information provided,)/i, '')
        .trim();
      
      // Extract Parts (First check for PART markers)
      const partRegex = /PART\s*(\d+)\s*:?\s*(.*?)(?=PART\s*\d+\s*:|\s*$)/gsi;
      const parts = Array.from(cleanedText.matchAll(partRegex));
      
      if (parts.length >= 2) {
        // If PART markers exist, extract content from each part
        parts.forEach(part => {
          const partNumber = part[1].trim();
          const partContent = part[2].trim();
          
          if (partNumber === '1') {
            standardized.geneticAnalysis = partContent;
          } else if (partNumber === '2') {
            standardized.clinicalDetails = partContent;
          }
        });
      } else {
        // If no PART markers, try to identify by key section headers
        const geneticKeywords = [
          'genetic analysis',
          'genetic information',
          'genetic findings',
          'mutation analysis',
          'cftr mutation'
        ];
        
        const clinicalKeywords = [
          'clinical recommendations',
          'clinical assessment',
          'treatment recommendations',
          'management plan',
          'clinical evaluation'
        ];
        
        // Try to split text based on key headers
        let foundSplit = false;
        
        for (const geneticKeyword of geneticKeywords) {
          for (const clinicalKeyword of clinicalKeywords) {
            const geneticRegex = new RegExp(`(${geneticKeyword})`, 'i');
            const clinicalRegex = new RegExp(`(${clinicalKeyword})`, 'i');
            
            if (geneticRegex.test(cleanedText) && clinicalRegex.test(cleanedText)) {
              // Find positions to split the text
              const geneticPosition = cleanedText.search(geneticRegex);
              const clinicalPosition = cleanedText.search(clinicalRegex);
              
              if (geneticPosition !== -1 && clinicalPosition !== -1 && geneticPosition < clinicalPosition) {
                standardized.geneticAnalysis = cleanedText.substring(
                  geneticPosition + geneticKeyword.length,
                  clinicalPosition
                ).trim();
                
                standardized.clinicalDetails = cleanedText.substring(
                  clinicalPosition + clinicalKeyword.length
                ).trim();
                
                foundSplit = true;
                break;
              }
            }
          }
          if (foundSplit) break;
        }
        
        // If we couldn't find clear sections, try a heuristic approach
        if (!foundSplit) {
          // Assume the first 40% is genetic analysis and the rest is clinical details
          const splitPoint = Math.floor(cleanedText.length * 0.4);
          standardized.geneticAnalysis = cleanedText.substring(0, splitPoint).trim();
          standardized.clinicalDetails = cleanedText.substring(splitPoint).trim();
        }
      }
      
      // Extra cleanup for the genetic analysis section
      standardized.geneticAnalysis = standardized.geneticAnalysis
        .replace(/^(genetic analysis|genetic information)/i, '')
        .trim();
      
      // Extra cleanup for the clinical details section
      standardized.clinicalDetails = standardized.clinicalDetails
        .replace(/^(clinical recommendations|clinical assessment)/i, '')
        .trim();
      
    } catch (error) {
      console.error('Error standardizing AI response:', error);
      // If an error occurs, just split the text in half as a fallback
      const halfPoint = Math.floor(rawText.length / 2);
      standardized.geneticAnalysis = rawText.substring(0, halfPoint).trim();
      standardized.clinicalDetails = rawText.substring(halfPoint).trim();
    }
    
    return standardized;
  };
  
  /**
   * Formats standardized patient data for display
   * @param {object} patient - The patient data object
   * @returns {object} - Formatted patient data
   */
  export const formatPatientData = (patient) => {
    // Ensure we have a valid patient object
    if (!patient) return null;
    
    // Standardize the AI response if needed
    let geneticSummary = patient.summary || '';
    let clinicalDetails = patient.details || '';
    
    // If we have raw AI output instead of already processed data
    if (patient.aiOutput && !patient.summary) {
      const standardized = standardizeAIResponse(patient.aiOutput, patient.aiProvider);
      geneticSummary = standardized.geneticAnalysis;
      clinicalDetails = standardized.clinicalDetails;
    }
    
    return {
      ...patient,
      summary: geneticSummary,
      details: clinicalDetails
    };
  };
  
  export default {
    standardizeAIResponse,
    formatPatientData
  };