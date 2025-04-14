// src/styles/theme.js - Global theme constants
const theme = {
    colors: {
      primary: '#4361EE',
      primaryLight: '#4895EF',
      secondary: '#3F37C9',
      accent: '#7209B7',
      success: '#4CAF50',
      error: '#F44336',
      warning: '#FF9800',
      info: '#2196F3',
      text: {
        primary: '#333333',
        secondary: '#5f6368',
        light: '#70757a',
        disabled: '#9AA0A6'
      },
      background: {
        main: '#FFFFFF',
        light: '#F8F9FA',
        card: '#FFFFFF',
        disabled: '#F1F3F4'
      },
      border: '#E0E0E0'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      xxl: '48px'
    },
    borderRadius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      pill: '999px'
    },
    shadows: {
      sm: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
      md: '0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)',
      lg: '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)',
      xl: '0 15px 25px rgba(0,0,0,0.15), 0 5px 10px rgba(0,0,0,0.05)'
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      fontWeights: {
        light: 300,
        regular: 400,
        medium: 500,
        semiBold: 600,
        bold: 700
      },
      sizes: {
        xs: '0.75rem',
        sm: '0.875rem',
        md: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        xxl: '1.5rem',
        xxxl: '2rem'
      }
    },
    breakpoints: {
      xs: '0px',
      sm: '600px',
      md: '960px',
      lg: '1280px',
      xl: '1920px'
    },
    transitions: {
      short: '0.15s ease-in-out',
      medium: '0.25s ease-in-out',
      long: '0.35s ease-in-out'
    }
  };
  
  export default theme;