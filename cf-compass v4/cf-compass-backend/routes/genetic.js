// routes/genetic.js - add this endpoint to your existing file
const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const router = express.Router();


// Add this endpoint to your genetic.js file

// Process a genetic sequence
router.post('/process', async (req, res) => {
    try {
      const { sequenceData } = req.body;
      
      if (!sequenceData) {
        return res.status(400).json({ 
          success: false, 
          error: 'No sequence data provided' 
        });
      }
      
      // Load CFTR reference sequence
      const referenceData = await fs.readFile(
        path.join(__dirname, '../data/references/cftr_reference.json'), 
        'utf8'
      );
      const referenceSequence = JSON.parse(referenceData).sequence;
      
      // Load CFTR variants data
      const variantsData = await fs.readFile(
        path.join(__dirname, '../data/references/cftr_variants.json'), 
        'utf8'
      );
      const knownVariants = JSON.parse(variantsData).variants;
      
      // Process the sequence to identify variants
      // For simplicity, we'll use the same detectVariants function
      const identifiedVariants = detectVariants(sequenceData, referenceSequence, knownVariants)
        .map(match => ({
          variant_id: match.variantType,
          position: match.position.toString(),
          pathogenicity: match.significance.includes("CF-causing") ? "Pathogenic" : 
                        match.significance.includes("Non CF") ? "Benign" : "Uncertain significance",
          clinical_significance: match.significance,
          frequency: match.matchType === 'common_deletion' ? "Common" : "Unknown",
          description: `${match.matchType} variant: ${match.referenceAllele} to ${match.observedAllele}`
        }));
      
      res.json({
        success: true,
        referenceGene: 'CFTR',
        referenceId: 'NM_000492.3',
        identifiedVariants
      });
    } catch (err) {
      console.error('Error processing genetic sequence:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to process genetic sequence' 
      });
    }
  });

// Compare sequence against reference and detect variants
router.post('/compare', async (req, res) => {
    try {
      const { sequenceData } = req.body;
      
      if (!sequenceData) {
        return res.status(400).json({
          success: false,
          error: 'No sequence data provided'
        });
      }
      
      // Load CFTR reference sequence
      const referenceData = await fs.readFile(
        path.join(__dirname, '../data/references/cftr_reference.json'), 
        'utf8'
      );
      const referenceSequence = JSON.parse(referenceData).sequence;
      
      // Load CFTR variants data
      const variantsData = await fs.readFile(
        path.join(__dirname, '../data/references/cftr_variants.json'), 
        'utf8'
      );
      const knownVariants = JSON.parse(variantsData).variants;
      
      // Compare sequence against reference and check for variants
      const matches = detectVariants(sequenceData, referenceSequence, knownVariants);
      
      res.json({
        success: true,
        referenceGene: 'CFTR',
        inputLength: sequenceData.length,
        referenceLength: referenceSequence.length,
        matches
      });
    } catch (err) {
      console.error('Error comparing genetic sequence:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to compare genetic sequence'
      });
    }
  });
  
  // Helper function to detect variants in a sequence
function detectVariants(inputSequence, referenceSequence, knownVariants) {
    const matches = [];
    
    // Normalize input sequence (remove whitespace, convert to uppercase)
    const normalizedInput = inputSequence.replace(/\s/g, '').toUpperCase();
    
    // Check where the input sequence aligns in the reference
    const inputPosition = referenceSequence.indexOf(normalizedInput);
    if (inputPosition === -1) {
      // Input sequence doesn't match reference exactly
      // We'll still check for variants by sliding window
    }
    
    // For each known variant in the reference file
    knownVariants.forEach(variant => {
      // Extract genomic positions from the variant data
      const position = variant["grch37_pos"];
      const ref = variant["grch37_ref"];
      const alt = variant["grch37_alt"];
      const variantName = variant["Variant legacy name"] || 
                         variant["Variant cDNA name"] || 
                         "Unknown variant";
      
      // Skip if missing critical information
      if (!position || !ref || !alt) return;
      
      // Determine the type of variant
      if (ref.length > alt.length) {
        // Deletion or delins
        const deletionLength = ref.length - alt.length;
        
        // Get context around deletion
        const contextBefore = referenceSequence.substring(
          Math.max(0, position - 20 - inputPosition), 
          position - inputPosition
        );
        
        const contextAfter = referenceSequence.substring(
          position + deletionLength - inputPosition,
          Math.min(referenceSequence.length, position + deletionLength - inputPosition + 20)
        );
        
        // Check if the input contains the junction where deletion would be
        if (normalizedInput.includes(contextBefore + contextAfter)) {
          matches.push({
            variantType: variantName,
            matchType: 'deletion',
            position: position,
            referenceAllele: ref,
            observedAllele: alt,
            significance: variant["Variant final determination 25 September 2024 (current version)"] || "Unknown"
          });
        }
      } 
      else if (ref.length < alt.length) {
        // Insertion or delins
        // Get context around insertion
        const insertionStart = position - inputPosition;
        const contextBefore = referenceSequence.substring(
          Math.max(0, insertionStart - 15), 
          insertionStart
        );
        
        const contextAfter = referenceSequence.substring(
          insertionStart + ref.length,
          Math.min(referenceSequence.length, insertionStart + ref.length + 15)
        );
        
        // Check if input contains the inserted sequence with context
        const mutatedContext = contextBefore + alt + contextAfter;
        if (normalizedInput.includes(mutatedContext)) {
          matches.push({
            variantType: variantName,
            matchType: 'insertion',
            position: position,
            referenceAllele: ref,
            observedAllele: alt,
            significance: variant["Variant final determination 25 September 2024 (current version)"] || "Unknown"
          });
        }
      }
      else if (ref.length === alt.length) {
        // Substitution
        // Get context around substitution
        const contextBefore = referenceSequence.substring(
          Math.max(0, position - 15 - inputPosition), 
          position - inputPosition
        );
        
        const contextAfter = referenceSequence.substring(
          position + ref.length - inputPosition,
          Math.min(referenceSequence.length, position + ref.length - inputPosition + 15)
        );
        
        // Create context with the alternate allele
        const mutatedContext = contextBefore + alt + contextAfter;
        
        // Check if input contains the mutation with context
        if (normalizedInput.includes(mutatedContext)) {
          matches.push({
            variantType: variantName,
            matchType: 'substitution',
            position: position,
            referenceAllele: ref,
            observedAllele: alt,
            significance: variant["Variant final determination 25 September 2024 (current version)"] || "Unknown"
          });
        }
      }
    });
    
    // If no exact matches are found, do a more aggressive search for common variants
    if (matches.length === 0) {
      // Look for common variants like F508del
      // This is a more targeted approach for frequently encountered variants
      
      // F508del detection (common CF variant)
      const f508delPattern = /ATT[^CTT]ATGCAG/i;  // Sequence around F508del junction
      if (f508delPattern.test(normalizedInput)) {
        matches.push({
          variantType: "F508del",
          matchType: 'common_deletion',
          position: "c.1521_1523del (p.Phe508del)",
          referenceAllele: "CTT",
          observedAllele: "-",
          significance: "CF-causing"
        });
      }
      
      // Add other common variants as needed
    }
    
    return matches;
  }


  module.exports = router;