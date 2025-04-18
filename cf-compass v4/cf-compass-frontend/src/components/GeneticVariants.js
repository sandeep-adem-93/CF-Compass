// src/components/GeneticVariants.js
import React from 'react';

// Variant types and their associated info
const VARIANT_INFO = {
  'F508del': {
    fullName: 'c.1521_1523delCTT (p.Phe508del)',
    description: 'Most common CFTR mutation. Causes protein misfolding and degradation.',
    severity: 'high',
    prevalence: 'Found in ~70% of CF patients',
    modulator: 'Responsive to Elexacaftor/Tezacaftor/Ivacaftor or Lumacaftor/Ivacaftor'
  },
  'G551D': {
    fullName: 'c.1652G>A (p.Gly551Asp)',
    description: 'Gating mutation that affects channel opening.',
    severity: 'high',
    prevalence: 'Found in ~4% of CF patients',
    modulator: 'Highly responsive to Ivacaftor'
  },
  'R117H': {
    fullName: 'c.350G>A (p.Arg117His)',
    description: 'Conductance mutation that reduces chloride flow.',
    severity: 'mild to moderate',
    prevalence: 'Found in ~3% of CF patients',
    modulator: 'Responsive to Ivacaftor'
  },
  'G542X': {
    fullName: 'c.1624G>T (p.Gly542X)',
    description: 'Nonsense mutation resulting in premature termination.',
    severity: 'high',
    prevalence: 'Found in ~2.5% of CF patients',
    modulator: 'Potentially responsive to read-through agents'
  },
  'W1282X': {
    fullName: 'c.3846G>A (p.Trp1282X)',
    description: 'Nonsense mutation resulting in premature termination.',
    severity: 'high',
    prevalence: 'Common in Ashkenazi Jewish population',
    modulator: 'Potentially responsive to read-through agents'
  },
  'N1303K': {
    fullName: 'c.3909C>G (p.Asn1303Lys)',
    description: 'Processing mutation affecting protein folding.',
    severity: 'high',
    prevalence: 'Found in ~2% of CF patients',
    modulator: 'Partially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  '2789+5G>A': {
    fullName: 'c.2657+5G>A',
    description: 'Splicing mutation affecting mRNA processing.',
    severity: 'moderate',
    prevalence: 'More common in European populations',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  '621+1G>T': {
    fullName: 'c.489+1G>T',
    description: 'Splicing mutation affecting exon 4 processing.',
    severity: 'moderate to severe',
    prevalence: 'Found in ~1.5% of CF patients',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  '1717-1G>A': {
    fullName: 'c.1585-1G>A',
    description: 'Splicing mutation affecting exon 11 processing.',
    severity: 'moderate to severe',
    prevalence: 'Found in ~1% of CF patients',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  'R553X': {
    fullName: 'c.1657C>T (p.Arg553X)',
    description: 'Nonsense mutation resulting in premature termination.',
    severity: 'high',
    prevalence: 'Found in ~1% of CF patients',
    modulator: 'Potentially responsive to read-through agents'
  },
  '3849+10kbC>T': {
    fullName: 'c.3718-2477C>T',
    description: 'Splicing mutation creating a cryptic splice site.',
    severity: 'mild to moderate',
    prevalence: 'Found in ~1% of CF patients',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  'R560T': {
    fullName: 'c.1679G>C (p.Arg560Thr)',
    description: 'Missense mutation affecting protein function.',
    severity: 'moderate',
    prevalence: 'Found in ~0.5% of CF patients',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  'A455E': {
    fullName: 'c.1364C>A (p.Ala455Glu)',
    description: 'Missense mutation affecting protein function.',
    severity: 'mild to moderate',
    prevalence: 'Found in ~0.5% of CF patients',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  'S549N': {
    fullName: 'c.1646G>A (p.Ser549Asn)',
    description: 'Missense mutation affecting protein function.',
    severity: 'moderate',
    prevalence: 'Found in ~0.5% of CF patients',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  'R347P': {
    fullName: 'c.1040G>C (p.Arg347Pro)',
    description: 'Missense mutation affecting protein function.',
    severity: 'moderate',
    prevalence: 'Found in ~0.5% of CF patients',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  'R334W': {
    fullName: 'c.1000C>T (p.Arg334Trp)',
    description: 'Missense mutation affecting protein function.',
    severity: 'mild to moderate',
    prevalence: 'Found in ~0.5% of CF patients',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  },
  '2184delA': {
    fullName: 'c.2052delA (p.Lys684Asnfs)',
    description: 'Frameshift mutation causing premature termination.',
    severity: 'high',
    prevalence: 'Found in ~0.5% of CF patients',
    modulator: 'Potentially responsive to Elexacaftor/Tezacaftor/Ivacaftor'
  }
};

// Helper to determine if patient is homozygous for a variant
const isHomozygous = (variants) => {
  if (!variants || variants.length < 2) return false;
  
  // Count occurrences of each variant
  const variantCounts = variants.reduce((counts, variant) => {
    counts[variant] = (counts[variant] || 0) + 1;
    return counts;
  }, {});
  
  // Check if any variant appears more than once
  return Object.values(variantCounts).some(count => count > 1);
};

// GeneticVariants component
const GeneticVariants = ({ variants = [], expanded = false }) => {
  console.log('Received variants:', variants);
  
  if (!variants || !Array.isArray(variants) || variants.length === 0) {
    console.log('No variants available');
    return (
      <div className="no-variants">
        <p>No variant information available</p>
      </div>
    );
  }
  
  // Validate that all variants have corresponding info
  const unknownVariants = variants.filter(variant => !VARIANT_INFO[variant]);
  if (unknownVariants.length > 0) {
    console.warn('Unknown variants found:', unknownVariants);
    console.warn('Available variant types:', Object.keys(VARIANT_INFO));
  }
  
  // Determine zygosity
  const homozygous = isHomozygous(variants);
  const zygosity = variants.length === 1 
    ? 'Single Variant'
    : homozygous 
      ? 'Homozygous'
      : 'Compound Heterozygous';
  
  console.log('Zygosity:', zygosity);
  console.log('Variants to display:', variants);
  
  // Determine color class based on variants severity
  const getVariantSeverityClass = (variant) => {
    const variantInfo = VARIANT_INFO[variant];
    if (!variantInfo) return 'unknown';
    
    if (variantInfo.severity === 'high') return 'high-severity';
    if (variantInfo.severity === 'moderate') return 'moderate-severity';
    if (variantInfo.severity === 'mild') return 'mild-severity';
    if (variantInfo.severity === 'mild to moderate') return 'mild-to-moderate-severity';
    if (variantInfo.severity === 'moderate to severe') return 'moderate-to-severe-severity';
    return 'unknown';
  };
  
  return (
    <div className="genetic-variants">
      <div className="zygosity-badge">
        <span className={homozygous ? 'homozygous' : 'heterozygous'}>
          {zygosity}
        </span>
      </div>
      
      <div className="variants-list">
        {variants.map((variant, index) => {
          const variantInfo = VARIANT_INFO[variant] || {};
          
          return (
            <div key={index} className={`variant-card ${getVariantSeverityClass(variant)}`}>
              <div className="variant-header">
                <h4 className="variant-name">{variant}</h4>
                {variantInfo.fullName && (
                  <span className="variant-full-name">{variantInfo.fullName}</span>
                )}
              </div>
              
              {expanded && (
                <div className="variant-details">
                  {variantInfo.description && (
                    <p className="variant-description">{variantInfo.description}</p>
                  )}
                  
                  <div className="variant-info-grid">
                    {variantInfo.severity && (
                      <div className="variant-info-item">
                        <span className="info-label">Severity:</span>
                        <span className={`severity-badge ${variantInfo.severity.replace(/\s+/g, '-').toLowerCase()}`}>
                          {variantInfo.severity}
                        </span>
                      </div>
                    )}
                    
                    {variantInfo.prevalence && (
                      <div className="variant-info-item">
                        <span className="info-label">Prevalence:</span>
                        <span className="info-value">{variantInfo.prevalence}</span>
                      </div>
                    )}
                    
                    {variantInfo.modulator && (
                      <div className="variant-info-item modulator-info">
                        <span className="info-label">Modulator therapy:</span>
                        <span className="info-value">{variantInfo.modulator}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GeneticVariants;