import React from 'react';
import './VariantChart.css';

function VariantChart({ data }) {
  // Color map for consistent variant colors
  const variantColors = {
    'F508del': '#4361EE',    // Blue
    'R117H': '#7209B7',      // Purple
    'G542X': '#F9A826',      // Orange
    'G551D': '#43AA8B',      // Teal
    'W1282X': '#F94144',     // Red
    'N1303K': '#90BE6D',     // Green
    '2789+5G>A': '#FF6B6B',  // Coral
    '621+1G>T': '#4ECDC4',   // Turquoise
    '1717-1G>A': '#FF9F1C',  // Amber
    'R553X': '#6A4C93',      // Deep Purple
    '3849+10kbC>T': '#2EC4B6', // Mint
    'R560T': '#E71D36',      // Crimson
    'A455E': '#FF9F1C',      // Gold
    'S549N': '#2D3047',      // Navy
    'R347P': '#93B7BE',      // Steel Blue
    'R334W': '#E0A458',      // Bronze
    '2184delA': '#C5D86D',   // Lime
    // Default color for any other variants
    'default': '#4CC9F0'     // Light Blue
  };

  // Get color for a variant
  const getVariantColor = (variant) => {
    return variantColors[variant] || variantColors.default;
  };

  // Calculate total count and percentages
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);
  
  // Calculate percentage and add color to each item
  const chartData = data.map(item => ({
    ...item,
    percentage: Math.round((item.count / totalCount) * 100),
    color: getVariantColor(item.name)
  }));

  // Sort data by count (descending)
  chartData.sort((a, b) => b.count - a.count);

  // Generate the conic gradient for the donut chart
  const generateConicGradient = () => {
    let gradient = '';
    let currentPercentage = 0;

    chartData.forEach((item, index) => {
      const startPercentage = currentPercentage;
      const endPercentage = currentPercentage + item.percentage;
      
      gradient += `${item.color} ${startPercentage}% ${endPercentage}%`;
      
      if (index < chartData.length - 1) {
        gradient += ', ';
      }
      
      currentPercentage = endPercentage;
    });

    return `conic-gradient(${gradient})`;
  };

  return (
    <div className="variant-chart-container">
      <h3 className="chart-title">Variant Distribution</h3>
      
      <div className="donut-container">
        <div 
          className="donut-chart" 
          style={{ background: generateConicGradient() }}
        >
          <div className="donut-inner">
            <div className="donut-value">{totalCount}</div>
            <div className="donut-label">Variants</div>
          </div>
        </div>
        
        <div className="chart-legend">
          {chartData.map((item, index) => (
            <div key={index} className="legend-item">
              <div className="legend-color" style={{ backgroundColor: item.color }}></div>
              <div className="legend-label">{item.name}</div>
              <div className="legend-value">
                {item.count} <span className="percentage">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VariantChart;