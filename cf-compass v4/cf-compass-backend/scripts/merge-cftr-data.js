const XLSX = require('xlsx');
const fs = require('fs-extra');
const path = require('path');

// Path to your Excel file
const excelFilePath = path.join(__dirname, '../data/sources/Variant List_CFTR2_092524.xlsx');

// Function to read Excel sheets
function readExcelSheets(filePath) {
  try {
    // Read the workbook
    const workbook = XLSX.readFile(filePath);
    
    // Get sheet names
    const sheetNames = workbook.SheetNames;
    
    if (sheetNames.length < 2) {
      throw new Error('The Excel file must contain at least two sheets');
    }
    
    console.log('Sheet names:', sheetNames);
    
    // Read clinical data (first sheet)
    const clinicalSheet = workbook.Sheets[sheetNames[0]];
    const clinicalData = XLSX.utils.sheet_to_json(clinicalSheet);
    
    // Read genomic data (second sheet)
    const genomicSheet = workbook.Sheets[sheetNames[1]];
    const genomicData = XLSX.utils.sheet_to_json(genomicSheet);
    
    // Print first row of each to see column headers
    if (clinicalData.length > 0) {
      console.log('Clinical sheet column headers:', Object.keys(clinicalData[0]));
    }
    
    if (genomicData.length > 0) {
      console.log('Genomic sheet column headers:', Object.keys(genomicData[0]));
    }
    
    return { clinicalData, genomicData };
  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw error;
  }
}

// Function to merge the data
function mergeData(clinicalData, genomicData) {
  const mergedVariants = [];
  const genomicMap = new Map();
  
  // If there's no data, return empty array
  if (!clinicalData.length && !genomicData.length) {
    console.error('No data found in Excel sheets');
    return [];
  }
  
  // Get correct column header names from first row
  const clinicalHeaders = clinicalData.length > 0 ? Object.keys(clinicalData[0]) : [];
  const genomicHeaders = genomicData.length > 0 ? Object.keys(genomicData[0]) : [];
  
  // Find the appropriate column names by partial matching
  const findHeader = (headers, pattern) => {
    const lowerPattern = pattern.toLowerCase();
    return headers.find(h => h.toLowerCase().includes(lowerPattern));
  };
  
  // Clinical headers
  const cDNAHeader = findHeader(clinicalHeaders, 'cdna');
  const legacyHeader = findHeader(clinicalHeaders, 'legacy');
  const proteinHeader = findHeader(clinicalHeaders, 'protein');
  const altNamesHeader = findHeader(clinicalHeaders, 'alternative');
  const alleleCountHeader = findHeader(clinicalHeaders, 'alleles reported');
  const frequencyHeader = findHeader(clinicalHeaders, 'frequency');
  const clinicalSignificanceHeader = findHeader(clinicalHeaders, 'determination');
  
  // Genomic headers
  const gCDNAHeader = findHeader(genomicHeaders, 'cdna');
  const gLegacyHeader = findHeader(genomicHeaders, 'legacy');
  const notesHeader = findHeader(genomicHeaders, 'notes');
  const grch37ChrHeader = findHeader(genomicHeaders, 'grch37_chr');
  const grch37PosHeader = findHeader(genomicHeaders, 'grch37_pos');
  const grch37RefHeader = findHeader(genomicHeaders, 'grch37_ref');
  const grch37AltHeader = findHeader(genomicHeaders, 'grch37_alt');
  const grch38ChrHeader = findHeader(genomicHeaders, 'grch38_chr');
  const grch38PosHeader = findHeader(genomicHeaders, 'grch38_pos');
  const grch38RefHeader = findHeader(genomicHeaders, 'grch38_ref');
  const grch38AltHeader = findHeader(genomicHeaders, 'grch38_alt');
  
  console.log('Using clinical headers:', {
    cDNAHeader, legacyHeader, proteinHeader, altNamesHeader,
    alleleCountHeader, frequencyHeader, clinicalSignificanceHeader
  });
  
  console.log('Using genomic headers:', {
    gCDNAHeader, gLegacyHeader, notesHeader,
    grch37ChrHeader, grch37PosHeader, grch37RefHeader, grch37AltHeader,
    grch38ChrHeader, grch38PosHeader, grch38RefHeader, grch38AltHeader
  });
  
  // Create a map from the genomic data for easy lookup
  genomicData.forEach(variant => {
    const cDNAName = gCDNAHeader ? variant[gCDNAHeader] : null;
    const legacyName = gLegacyHeader ? variant[gLegacyHeader] : null;
    
    // Store by both keys to maximize matching
    if (cDNAName) genomicMap.set(cDNAName, variant);
    if (legacyName) genomicMap.set(legacyName, variant);
  });
  
  // Process each clinical variant and find its matching genomic data
  clinicalData.forEach(clinical => {
    const cDNAName = cDNAHeader ? clinical[cDNAHeader] : '';
    const legacyName = legacyHeader ? clinical[legacyHeader] : '';
    
    // For debugging
    if (cDNAName || legacyName) {
      console.log(`Processing clinical variant: ${cDNAName || legacyName}`);
    }
    
    // Look for matching genomic data
    let genomic = null;
    if (cDNAName && genomicMap.has(cDNAName)) {
      genomic = genomicMap.get(cDNAName);
    } else if (legacyName && genomicMap.has(legacyName)) {
      genomic = genomicMap.get(legacyName);
    }
    
    // Create merged variant entry
    const mergedVariant = {
      cDNAName: cDNAHeader ? clinical[cDNAHeader] || '' : '',
      legacyName: legacyHeader ? clinical[legacyHeader] || '' : '',
      proteinName: proteinHeader ? clinical[proteinHeader] || '' : '',
      alternativeNames: (altNamesHeader && clinical[altNamesHeader]) 
        ? clinical[altNamesHeader].split('|') 
        : [],
      frequency: {
        alleleCount: alleleCountHeader ? clinical[alleleCountHeader] || 0 : 0,
        percentage: frequencyHeader ? clinical[frequencyHeader] || '0%' : '0%'
      },
      clinicalSignificance: clinicalSignificanceHeader 
        ? clinical[clinicalSignificanceHeader] || 'Unknown' 
        : 'Unknown'
    };
    
    // Add genomic data if available
    if (genomic) {
      mergedVariant.genomicCoordinates = {
        grch37: {
          chr: grch37ChrHeader ? genomic[grch37ChrHeader] || 7 : 7,
          pos: grch37PosHeader ? genomic[grch37PosHeader] || 0 : 0,
          ref: grch37RefHeader ? genomic[grch37RefHeader] || '' : '',
          alt: grch37AltHeader ? genomic[grch37AltHeader] || '' : ''
        },
        grch38: {
          chr: grch38ChrHeader ? genomic[grch38ChrHeader] || 7 : 7,
          pos: grch38PosHeader ? genomic[grch38PosHeader] || 0 : 0,
          ref: grch38RefHeader ? genomic[grch38RefHeader] || '' : '',
          alt: grch38AltHeader ? genomic[grch38AltHeader] || '' : ''
        }
      };
      
      mergedVariant.notes = notesHeader ? genomic[notesHeader] || '' : '';
    }
    
    mergedVariants.push(mergedVariant);
  });
  
  // Check for genomic entries that weren't matched with clinical data
  genomicData.forEach(genomic => {
    const cDNAName = gCDNAHeader ? genomic[gCDNAHeader] : null;
    const legacyName = gLegacyHeader ? genomic[gLegacyHeader] : null;
    
    // Check if this genomic entry already has a match in mergedVariants
    const alreadyIncluded = mergedVariants.some(v => 
      v.cDNAName === cDNAName || v.legacyName === legacyName
    );
    
    // If not already included, add it with limited information
    if (!alreadyIncluded && (cDNAName || legacyName)) {
      const mergedVariant = {
        cDNAName: cDNAName || '',
        legacyName: legacyName || '',
        notes: notesHeader ? genomic[notesHeader] || '' : '',
        clinicalSignificance: 'Unknown', // No clinical data available
        genomicCoordinates: {
          grch37: {
            chr: grch37ChrHeader ? genomic[grch37ChrHeader] || 7 : 7,
            pos: grch37PosHeader ? genomic[grch37PosHeader] || 0 : 0,
            ref: grch37RefHeader ? genomic[grch37RefHeader] || '' : '',
            alt: grch37AltHeader ? genomic[grch37AltHeader] || '' : ''
          },
          grch38: {
            chr: grch38ChrHeader ? genomic[grch38ChrHeader] || 7 : 7,
            pos: grch38PosHeader ? genomic[grch38PosHeader] || 0 : 0,
            ref: grch38RefHeader ? genomic[grch38RefHeader] || '' : '',
            alt: grch38AltHeader ? genomic[grch38AltHeader] || '' : ''
          }
        }
      };
      
      mergedVariants.push(mergedVariant);
    }
  });
  
  return mergedVariants;
}

// Main function
async function main() {
  try {
    // Create the output directory if it doesn't exist
    const outputDir = path.join(__dirname, '../data/references');
    await fs.ensureDir(outputDir);
    
    // Read the Excel sheets
    const { clinicalData, genomicData } = readExcelSheets(excelFilePath);
    
    console.log(`Read ${clinicalData.length} clinical variants and ${genomicData.length} genomic variants`);
    
    // Merge the data
    const mergedVariants = mergeData(clinicalData, genomicData);
    
    console.log(`Created ${mergedVariants.length} merged variant entries`);
    
    // Check if we have any valid data
    if (mergedVariants.length === 0 || !mergedVariants.some(v => v.cDNAName || v.legacyName)) {
      console.error('Warning: No valid variants were generated');
    }
    
    // Create the final JSON structure
    const finalData = {
      sourceDatabase: "CFTR2",
      sourceDate: "2024-09-25",
      variants: mergedVariants
    };
    
    // Write the output JSON file
    const outputFilePath = path.join(outputDir, 'cftr_variants.json');
    await fs.writeJson(outputFilePath, finalData, { spaces: 2 });
    
    console.log(`Successfully created merged CFTR variant database at ${outputFilePath}`);
  } catch (error) {
    console.error('Error in processing:', error);
  }
}

// Run the main function
main();