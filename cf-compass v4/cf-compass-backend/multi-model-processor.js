// cf-compass-backend/multi-model-processor.js
const fs = require('fs');
const { processFhirJsonFile } = require("./fhirtoprompt");

/**
 * Analyzes FHIR data using multiple AI providers
 * @param {object} fhirData - FHIR data object
 * @param {string} apiKey - API key for the selected provider
 * @param {string} modelProvider - AI provider to use ('gemini', 'openai', 'anthropic')
 * @returns {Promise<object>} - The model's analysis with genetic and clinical sections
 */

async function analyzeWithMultipleProviders(fhirData, apiKey, modelProvider) {
  try {
    console.log('=== Starting LLM Analysis ===');
    console.log('Model Provider:', modelProvider);
    console.log('API Key Length:', apiKey.length);
    
    // Process the FHIR data
    const patientParagraph = await processFhirJsonFile(fhirData, apiKey, modelProvider);
    console.log('Processed FHIR data into text description successfully');
    
    // Define the required sections at the top level
    const requiredSections = [
      'Pulmonary Management',
      'Pancreatic/Nutritional Management',
      'CFTR Modulator Therapy Considerations',
      'Monitoring and Follow-up Recommendations'
    ];
    
    console.log('Required sections defined:', requiredSections);
    
    // Base prompt template used across all models
    const promptTemplate = `You are a cystic fibrosis genetic specialist analyzing patient data. Your analysis must strictly follow this format:

PART 1: GENETIC ANALYSIS
- Start with a clear statement about the patient's CFTR gene variants.
- Explain what each mutation is and how it affects the CFTR protein.
- Discuss the implications of these specific mutations in combination.
- Do not use bullet points or asterisks.
- Write in full paragraphs with clear, professional language.
- End this section with a concise summary of the genetic findings.

PART 2: CLINICAL RECOMMENDATIONS
- Structure this section with numbered headings (e.g., "1. Pulmonary Management:")
- Under each numbered heading, provide detailed recommendations in paragraph form.
- Include the following sections at minimum (if applicable):
  1. Pulmonary Management
  2. Pancreatic/Nutritional Management
  3. CFTR Modulator Therapy Considerations
  4. Monitoring and Follow-up Recommendations
- End with a comprehensive summary of the treatment approach.

IMPORTANT FORMATTING RULES:
- DO NOT use markdown formatting, asterisks, or hash symbols
- DO NOT write "Part 1" and "Part 2"
- Use complete sentences and professional medical terminology
- Avoid phrases like "based on the provided information" or references to yourself
- Number each section in Part 2 starting with "1."
- Present information in a factual, authoritative manner
- End each section with a clear conclusion
`;
    
    // Combine patient data with prompt
    const fullPrompt = `${patientParagraph}\n\n${promptTemplate}`;
    console.log('Full prompt length:', fullPrompt.length);
    
    let responseText = '';
    
    // Use the appropriate API based on the provider
    switch(modelProvider.toLowerCase()) {
      case 'gemini':
        console.log('Calling Gemini API...');
        responseText = await callGeminiAPI(fullPrompt, apiKey);
        break;
      case 'openai':
        console.log('Calling OpenAI API...');
        responseText = await callOpenAIAPI(fullPrompt, apiKey);
        break;
      case 'anthropic':
        console.log('Calling Anthropic API...');
        responseText = await callAnthropicAPI(fullPrompt, apiKey);
        break;
      default:
        throw new Error(`Unsupported model provider: ${modelProvider}`);
    }
    
    console.log('Received response from API, length:', responseText.length);
    
    // Process the response
    let geneticSummary = '';
    let clinicalDetails = [];
    
    // First, try to split the response into genetic analysis and clinical recommendations
    const geneticAnalysisMatch = responseText.match(/GENETIC ANALYSIS\s*([\s\S]*?)(?=CLINICAL RECOMMENDATIONS|$)/i);
    const clinicalRecommendationsMatch = responseText.match(/CLINICAL RECOMMENDATIONS\s*([\s\S]*?)$/i);
    
    if (geneticAnalysisMatch) {
      // Extract genetic analysis and remove any clinical recommendations that might have been included
      geneticSummary = geneticAnalysisMatch[1]
        .replace(/\d+\.\s*(Pulmonary|Pancreatic|CFTR|Monitoring).*?(?=\d+\.|$)/g, '')
        .trim();
      console.log('Extracted genetic summary, length:', geneticSummary.length);
    } else {
      console.log('No genetic analysis section found, using first half of response');
      const halfPoint = Math.floor(responseText.length / 2);
      geneticSummary = responseText.substring(0, halfPoint)
        .replace(/\d+\.\s*(Pulmonary|Pancreatic|CFTR|Monitoring).*?(?=\d+\.|$)/g, '')
        .trim();
    }
    
    // Initialize clinical details with empty sections
    clinicalDetails = requiredSections.map(section => ({
      type: 'recommendation',
      text: section,
      value: 'No specific recommendations available.'
    }));
    
    // Process clinical recommendations if found
    if (clinicalRecommendationsMatch) {
      const clinicalText = clinicalRecommendationsMatch[1].trim();
      console.log('Processing clinical recommendations, length:', clinicalText.length);
      
      // Extract each section
      requiredSections.forEach((section, index) => {
        console.log(`Processing section: ${section}`);
        // Look for numbered sections (e.g., "1. Pulmonary Management:")
        const sectionRegex = new RegExp(`\\d+\\.\\s*${section}[\\s\\S]*?(?=\\d+\\.\\s*|$)`, 'i');
        const match = clinicalText.match(sectionRegex);
        
        if (match) {
          console.log(`Found section: ${section}`);
          // Extract the content after the section title
          const content = match[0]
            .replace(new RegExp(`\\d+\\.\\s*${section}\\s*:?\\s*`, 'i'), '')
            .trim()
            .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
            .replace(/In summary.*$/i, '') // Remove summary statements
            .trim();
            
          if (content) {
            clinicalDetails[index].value = content;
            console.log(`Content length for ${section}:`, content.length);
          }
        } else {
          console.log(`Section not found: ${section}`);
        }
      });
    } else {
      console.log('No clinical recommendations section found, using fallback parsing');
      // Try to find sections in the second half of the response
      const halfPoint = Math.floor(responseText.length / 2);
      const clinicalText = responseText.substring(halfPoint);
      
      requiredSections.forEach((section, index) => {
        const sectionRegex = new RegExp(`${section}[\\s\\S]*?(?=\\n\\s*\\d+\\.\\s*|$)`, 'i');
        const match = clinicalText.match(sectionRegex);
        
        if (match) {
          const content = match[0]
            .replace(new RegExp(`${section}\\s*:?\\s*`, 'i'), '')
            .trim()
            .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
            .replace(/In summary.*$/i, '') // Remove summary statements
            .trim();
            
          if (content) {
            clinicalDetails[index].value = content;
          }
        }
      });
    }
    
    console.log('Final genetic summary length:', geneticSummary.length);
    console.log('Final clinical details count:', clinicalDetails.length);
    
    return {
      geneticSummary,
      clinicalDetails,
      providerUsed: modelProvider
    };
  } catch (error) {
    console.error('Error in analyzeWithMultipleProviders:', error);
    throw error;
  }
}

// Helper function for Google Gemini API
async function callGeminiAPI(prompt, apiKey) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  console.log("Calling Gemini API");
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Helper function for OpenAI API
async function callOpenAIAPI(prompt, apiKey) {
  try {
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey });
    
    console.log("Calling OpenAI API");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a medical expert specializing in cystic fibrosis." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
    });
    
    return completion.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI API error:", error);
    
    // Include additional error details if available
    if (error.response) {
      console.error("OpenAI API response error:", {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    throw error;
  }
}

// Helper function for Anthropic API
async function callAnthropicAPI(prompt, apiKey) {
  try {
    const { Anthropic } = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey });
    
    console.log("Calling Anthropic API");
    const message = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      system: "You are a medical expert specializing in cystic fibrosis.",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 4000,
    });
    
    return message.content[0].text;
  } catch (error) {
    console.error("Anthropic API error:", error);
    
    // Include additional error details if available
    if (error.response) {
      console.error("Anthropic API response error:", {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    throw error;
  }
}

module.exports = {
  analyzeWithMultipleProviders
};