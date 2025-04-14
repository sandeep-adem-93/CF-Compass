// cf-compass-backend/services/geneticService.js
const fs = require('fs');
const path = require('path');

// Load reference data
const loadReferenceData = () => {
  try {
    const data = fs.readFileSync(
      path.join(__dirname, '../data/references/cftr_reference.json'),
      'utf8'
    );
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading reference data:', error);
    throw new Error('Failed to load reference data');
  }
};

// Simple sequence parser - in a real app, this would use a bioinformatics library
const parseSequence = (sequenceData) => {
  // Remove whitespace and normalize
  return sequenceData.replace(/\s/g, '').toUpperCase();
};

// Identify variants by simple pattern matching
// In a real application, this would use proper alignment algorithms
const identifyVariants = (patientSequence, referenceData) => {
  const referenceSequence = referenceData.sequence_excerpt;
  const knownVariants = referenceData.known_variants;
  const identified = [];
  
  // For demonstration purposes, we'll use a simplified approach
  // that just checks for known variants rather than doing a full alignment
  
  knownVariants.forEach(variant => {
    // This is a simplified check that would be replaced with proper sequence alignment
    // in a production application
    if (variant.variant_id === 'F508del') {
      // Special case for deletion
      const position = parseInt(variant.position);
      const beforeDel = referenceSequence.substring(position - 10, position - 1);
      const afterDel = referenceSequence.substring(position + 2, position + 11);
      const pattern = beforeDel + afterDel;
      
      if (patientSequence.includes(pattern)) {
        identified.push({
          ...variant,
          found: true,
          confidence: "High"
        });
      }
    } else {
      // Simple substitution check (very simplified)
      // We'd normally use proper alignment and variant calling tools
      const position = parseInt(variant.position);
      // Create a check pattern with variant
      const regionSize = 10;
      const beforeVar = referenceSequence.substring(position - regionSize, position - 1);
      const afterVar = referenceSequence.substring(position, position + regionSize - 1);
      const pattern = beforeVar + variant.variant + afterVar;
      
      if (patientSequence.includes(pattern)) {
        identified.push({
          ...variant,
          found: true,
          confidence: "High"
        });
      }
    }
  });
  
  return identified;
};

// Classify variants based on pathogenicity
const classifyVariants = (variants) => {
  const categories = {
    pathogenic: [],
    likelyPathogenic: [],
    uncertain: [],
    likelyBenign: [],
    benign: []
  };
  
  variants.forEach(variant => {
    switch(variant.pathogenicity) {
      case 'Pathogenic':
        categories.pathogenic.push(variant);
        break;
      case 'Likely pathogenic':
        categories.likelyPathogenic.push(variant);
        break;
      case 'Uncertain significance':
        categories.uncertain.push(variant);
        break;
      case 'Likely benign':
        categories.likelyBenign.push(variant);
        break;
      case 'Benign':
        categories.benign.push(variant);
        break;
      default:
        categories.uncertain.push(variant);
    }
  });
  
  return categories;
};

// Process genetic data
const processGeneticData = (sequenceData) => {
  try {
    const referenceData = loadReferenceData();
    const parsedSequence = parseSequence(sequenceData);
    const identifiedVariants = identifyVariants(parsedSequence, referenceData);
    const classifiedVariants = classifyVariants(identifiedVariants);
    
    return {
      success: true,
      parsedSequence: parsedSequence.substring(0, 50) + '...',  // Truncated for readability
      identifiedVariants,
      classifiedVariants,
      referenceGene: referenceData.gene,
      referenceId: referenceData.reference_id
    };
  } catch (error) {
    console.error('Error processing genetic data:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  processGeneticData
};