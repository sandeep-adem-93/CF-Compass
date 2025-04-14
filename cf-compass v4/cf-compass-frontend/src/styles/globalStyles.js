// src/styles/globalStyles.js
import { createGlobalStyle } from 'styled-components';
import theme from './theme';

const GlobalStyles = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: ${theme.typography.fontFamily};
    font-size: ${theme.typography.sizes.md};
    color: ${theme.colors.text.primary};
    background-color: ${theme.colors.background.light};
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: ${theme.typography.fontWeights.semiBold};
    margin-bottom: ${theme.spacing.md};
    line-height: 1.2;
  }

  h1 {
    font-size: ${theme.typography.sizes.xxxl};
  }

  h2 {
    font-size: ${theme.typography.sizes.xxl};
  }

  h3 {
    font-size: ${theme.typography.sizes.xl};
  }

  p {
    margin-bottom: ${theme.spacing.md};
  }

  a {
    color: ${theme.colors.primary};
    text-decoration: none;
    transition: color ${theme.transitions.short};

    &:hover {
      color: ${theme.colors.primaryLight};
    }
  }

  button, input, select, textarea {
    font-family: inherit;
    font-size: inherit;
  }

  /* Remove default button styling */
  button {
    background: none;
    border: none;
    cursor: pointer;
  }

  /* Basic accessibility outline */
  :focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }
`;

export default GlobalStyles;