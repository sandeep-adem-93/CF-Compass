import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadPatientData } from '../services/patientService';
import { generateCFPatient } from '../services/patientGenerator';
import './AddPatientModal.css';

function AddPatientModal({ onClose, onAddPatient }) {
  const [patientData, setPatientData] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisStage, setAnalysisStage] = useState('');
  const [error, setError] = useState('');
  const [modelProvider, setModelProvider] = useState('gemini');
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        // Validate JSON format
        JSON.parse(content);
        setPatientData(content);
        setError('');
      } catch (err) {
        setError('Invalid JSON format. Please upload a valid patient data file.');
      }
    };
    reader.onerror = () => {
      setError('Failed to read file. Please try again.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        // Validate JSON format
        JSON.parse(content);
        setPatientData(content);
        setError('');
      } catch (err) {
        setError('Invalid JSON format. Please upload a valid patient data file.');
      }
    };
    reader.onerror = () => {
      setError('Failed to read file. Please try again.');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleGeneratePatient = async () => {
    if (!apiKey) {
      setError('Please enter your API key');
      return;
    }

    setIsLoading(true);
    setError('');
    setAnalysisStage('Generating patient data...');

    try {
      const generatedPatient = await generateCFPatient(apiKey, modelProvider);
      setPatientData(JSON.stringify(generatedPatient, null, 2));
      setFileName('Generated Patient Data');
      setError('');
    } catch (error) {
      console.error('Error generating patient:', error);
      setError('Error generating patient data: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
      setAnalysisStage('');
    }
  };

  const processPatient = async () => {
    if (!patientData) {
      setError('Please upload a patient data file');
      return;
    }
  
    if (!apiKey || apiKey.trim().length === 0) {
      setError('Please enter your API key');
      return;
    }
  
    setIsLoading(true);
    setError('');
    setAnalysisStage('Uploading patient data...');
  
    try {
      // Parse the patient data JSON to ensure it's valid
      let parsedData;
      try {
        parsedData = JSON.parse(patientData);
        console.log("Successfully parsed patient data JSON");
      } catch (parseError) {
        console.error("Error parsing patient data:", parseError);
        throw new Error('Invalid JSON format in the uploaded file');
      }
      
      // Debug logs before submission
      console.log("About to submit data to backend:");
      console.log("API Key:", apiKey ? `${apiKey.substring(0, 5)}... (length: ${apiKey.length})` : 'missing');
      console.log("Model Provider:", modelProvider);
      console.log("Patient data:", {
        type: typeof parsedData,
        resourceType: parsedData.resourceType,
        hasEntries: !!parsedData.entry?.length
      });
      
      // Verify this is a FHIR Bundle
      if (!parsedData.resourceType) {
        throw new Error('The uploaded file is missing the resourceType property');
      }
      
      if (parsedData.resourceType !== 'Bundle') {
        throw new Error('The uploaded file is not a FHIR Bundle. Expected resourceType: "Bundle"');
      }
      
      // Check if it has entries
      if (!parsedData.entry || !Array.isArray(parsedData.entry) || parsedData.entry.length === 0) {
        throw new Error('The FHIR Bundle does not contain any entries');
      }
      
      setAnalysisStage(`Analyzing with ${modelProvider}...`);
      
      // Send to backend with API key for analysis
      const requestData = {
        patientData: parsedData,
        apiKey: apiKey.trim(),
        modelProvider: modelProvider.trim()
      };

      console.log("Sending request with data:", {
        apiKeyLength: requestData.apiKey.length,
        modelProvider: requestData.modelProvider,
        patientDataType: typeof requestData.patientData
      });
      
      const response = await uploadPatientData(requestData);
      console.log("Upload response:", response);

      if (response && response.success) {
        // Call the onAddPatient callback to refresh the patient list
        if (onAddPatient) {
          await onAddPatient(response.patient);
        }
        
        // Close the modal
        onClose();
        
        // Navigate to the patient details page if we have an ID
        if (response.patientId) {
          navigate(`/patient/${response.patientId}`);
        }
      } else {
        throw new Error(response?.error || 'Failed to process patient data');
      }
      
    } catch (error) {
      console.error('Error processing patient:', error);
      setError('Error processing patient data: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
      setAnalysisStage('');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add New Patient</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {!isLoading ? (
            <>
              <div 
                className="upload-area"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {fileName ? (
                  <div className="file-selected">
                    <div className="file-icon">📄</div>
                    <div className="file-name">{fileName}</div>
                  </div>
                ) : (
                  <>
                    <div className="upload-icon">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                    </div>
                    <p>Drag & drop your patient JSON file here</p>
                    <span>or</span>
                  </>
                )}
                <label className="file-input-label">
                  Browse Files
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleFileChange} 
                    className="file-input"
                  />
                </label>
              </div>

              <div className="model-provider-section">
                <label>Select AI Model:</label>
                <div className="model-options">
                  <div 
                    className={`model-option ${modelProvider === 'gemini' ? 'selected' : ''}`}
                    onClick={() => setModelProvider('gemini')}
                  >
                    <div className="model-icon gemini">G</div>
                    <div className="model-info">
                      <div className="model-name">Gemini</div>
                      <div className="model-description">Gemini Flash 1.5</div>
                    </div>
                  </div>

                  <div 
                    className={`model-option ${modelProvider === 'openai' ? 'selected' : ''}`}
                    onClick={() => setModelProvider('openai')}
                  >
                    <div className="model-icon openai">O</div>
                    <div className="model-info">
                      <div className="model-name">OpenAI</div>
                      <div className="model-description">GPT-4 Turbo</div>
                    </div>
                  </div>

                  <div 
                    className={`model-option ${modelProvider === 'anthropic' ? 'selected' : ''}`}
                    onClick={() => setModelProvider('anthropic')}
                  >
                    <div className="model-icon anthropic">A</div>
                    <div className="model-info">
                      <div className="model-name">Anthropic</div>
                      <div className="model-description">Claude 3 Opus</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="api-key-section">
                <label htmlFor="api-key">Enter your {modelProvider === 'gemini' ? 'Gemini' : modelProvider === 'openai' ? 'OpenAI' : 'Anthropic'} API key:</label>
                <input
                  type="text"
                  id="api-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter your ${modelProvider === 'gemini' ? 'Gemini' : modelProvider === 'openai' ? 'OpenAI' : 'Anthropic'} API key`}
                  className="api-key-input"
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="modal-actions">
                <button 
                  className="generate-button"
                  onClick={handleGeneratePatient}
                  disabled={!apiKey}
                >
                  Generate Patient
                </button>
                <button 
                  className="cancel-button" 
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button 
                  className="analyze-button"
                  onClick={processPatient}
                  disabled={isLoading || !patientData || !apiKey}
                >
                  Run Patient Analysis
                </button>
              </div>
            </>
          ) : (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <div className="loading-text">
                <div className="loading-stage">{analysisStage}</div>
                <div className="loading-info">This may take a few moments...</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddPatientModal;