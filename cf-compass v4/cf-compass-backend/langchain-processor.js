// // cf-compass-backend/langchain-processor.js
// const { ChatOpenAI } = require("@langchain/openai");
// const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
// const { ChatAnthropic } = require("@langchain/anthropic");
// const { PromptTemplate } = require("@langchain/core/prompts");
// const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
// const { processFhirJsonFile } = require("./fhirtoprompt");
// const fs = require('fs');

// /**
//  * Process FHIR data with a LLM using LangChain
//  * @param {string} fhirFilePath - Path to the FHIR JSON file
//  * @param {string} modelProvider - The AI provider to use ('openai', 'anthropic', 'gemini')
//  * @param {string} apiKey - API key for the selected provider
//  * @returns {Promise<object>} - Analysis results with genetic and clinical sections
//  */
// async function analyzeFhirWithLangChain(fhirFilePath, modelProvider, apiKey) {
//   try {
//     // Read the FHIR file
//     const jsonStr = fs.readFileSync(fhirFilePath, 'utf8');
    
//     // Process the FHIR file to generate a patient description
//     const patientParagraph = processFhirJsonFile(jsonStr);
    
//     console.log(`Using model provider: ${modelProvider}`);
//     console.log(`API key present: ${apiKey ? 'Yes (length: ' + apiKey.length + ')' : 'No'}`);
    
//     // Create the appropriate model based on provider
//     let model;
    
//     switch (modelProvider.toLowerCase()) {
//       case 'openai':
//         model = new ChatOpenAI({
//           openAIApiKey: apiKey,
//           modelName: "gpt-4o",
//           temperature: 0.2
//         });
//         break;
      
//       case 'anthropic':
//         model = new ChatAnthropic({
//           anthropicApiKey: apiKey,
//           modelName: "claude-3-opus-20240229",
//           temperature: 0.2
//         });
//         break;
      
//       case 'gemini':
//         model = new ChatGoogleGenerativeAI({
//           apiKey: apiKey,
//           modelName: "gemini-1.5-flash",
//           temperature: 0.2
//         });
//         break;
        
//       default:
//         throw new Error(`Unsupported model provider: ${modelProvider}`);
//     }
    
//     // Define the system prompt
//     const systemPrompt = `You are a medical expert specializing in cystic fibrosis analysis.
//     Review the patient data and provide:
//     1. A genetic analysis of the CFTR variants detected
//     2. Treatment recommendations and clinical considerations

//     Format your response in two clearly labeled sections:
//     GENETIC ANALYSIS: Focus on the genetic variants and their implications
//     CLINICAL RECOMMENDATIONS: Provide specific treatment considerations for this patient`;
    
//     // Create messages for the LLM
//     const messages = [
//       new SystemMessage(systemPrompt),
//       new HumanMessage(`${patientParagraph}\n\nProvide a comprehensive analysis of this patient's condition.`)
//     ];
    
//     console.log("Calling model with messages...");
    
//     // Get response from the LLM
//     const response = await model.invoke(messages);
//     const responseText = response.content;
    
//     console.log("Received response from model");
    
//     // Extract genetic and clinical sections
//     let geneticSummary = '';
//     let clinicalDetails = '';
    
//     if (responseText.includes('GENETIC ANALYSIS') && responseText.includes('CLINICAL RECOMMENDATIONS')) {
//       // Extract the two main sections
//       const sections = responseText.split('CLINICAL RECOMMENDATIONS');
//       geneticSummary = sections[0].replace('GENETIC ANALYSIS', '').trim();
//       clinicalDetails = sections[1].trim();
//     } else {
//       // Fallback if the LLM didn't format correctly
//       const halfPoint = Math.floor(responseText.length / 2);
//       geneticSummary = responseText.substring(0, halfPoint);
//       clinicalDetails = responseText.substring(halfPoint);
//     }
    
//     return {
//       geneticSummary,
//       clinicalDetails,
//       providerUsed: modelProvider
//     };
//   } catch (error) {
//     console.error("Error in analyzeFhirWithLangChain:", error);
//     throw error;
//   }
// }

// module.exports = {
//   analyzeFhirWithLangChain
// };