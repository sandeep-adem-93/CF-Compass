const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { processFhirJsonFile } = require("./fhirtoprompt");

/**
 * Analyzes FHIR data using the Gemini model
 * @param {string} fhirFilePath - Path to the FHIR JSON file
 * @param {string} promptTemplate - Additional instructions for the model
 * @param {string} apiKey - Google Generative AI API key
 * @returns {Promise<string>} - The model's analysis
 */
async function analyzeFhirWithGemini(fhirFilePath, promptTemplate, apiKey) {
  // Initialize the Google Generative AI client
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    // Read the FHIR file
    const jsonStr = fs.readFileSync(fhirFilePath, 'utf8');
    
    // Process the FHIR file to generate a paragraph
    const patientParagraph = processFhirJsonFile(jsonStr);
    
    // Combine the patient information with the prompt template
    const fullPrompt = `${patientParagraph} ${promptTemplate}`;
    
    // Generate content using Gemini
    const result = await model.generateContent(fullPrompt);
    return result.response.text();
  } catch (error) {
    console.error("Error in analyzeFhirWithGemini:", error);
    throw error;
  }
}

// async function main() {
//   // Define your API key (consider using environment variables for security)
//   const apiKey = "AIzaSyA4UyFDw9Z9lQXGRndnv1Foyw62rYyOWOg";
  
//   // Define the path to your FHIR file
//   const fhirFilePath = "./cf_patient_1.json";
  
//   // Define the prompt template for the medical analysis
//   const promptTemplate = "You are an experienced medical expert AI assisting clinicians. Given the above patient data, analyze their current conditions, family history, lab results, and lifestyle factors. Conduct CF variant analysis and provide clinical recommendations.";
  
//   try {
//     const analysis = await analyzeFhirWithGemini(fhirFilePath, promptTemplate, apiKey);
    
//     // Output the analysis
//     console.log("ANALYSIS RESULTS:");
//     console.log(analysis);
    
//     // Optionally save the analysis to a file
//     fs.writeFileSync("patient_analysis.txt", analysis, 'utf8');
//     console.log("Analysis saved to patient_analysis.txt");
    
//   } catch (error) {
//     console.error("Error in main:", error);
//   }
// }

// Run the main function
// main();

// Alternatively, you can make this callable as a module
module.exports = {
  analyzeFhirWithGemini
};
