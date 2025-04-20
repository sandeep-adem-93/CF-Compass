const { exec } = require('child_process');
const path = require('path');
const express = require('express');
const app = express();

// Build the frontend
console.log('Building frontend...');
exec('cd ../cf-compass-frontend && npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error building frontend: ${error}`);
    return;
  }
  console.log('Frontend build completed successfully');
  
  // Serve static files from the frontend build directory
  app.use(express.static(path.join(__dirname, '../cf-compass-frontend/build')));
  
  // Catch-all route to serve the React app
  app.get('*', (req, res) => {
    // Check if the request is for an API endpoint
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    // For all other routes, serve the frontend application
    res.sendFile(path.join(__dirname, '../cf-compass-frontend/build/index.html'));
  });
  
  // Start the server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}); 