// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Import routes
const patientsRouter = require('./routes/patients');
const geneticRouter = require('./routes/genetic');

// Register routes
app.use('/api/patients', patientsRouter);
app.use('/api/genetic', geneticRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// In your patients.js routes file or where you define your endpoints
app.delete('/api/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the patient data file
    const patientIndex = patientData.findIndex(p => p.id === id);
    
    if (patientIndex === -1) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    // Remove the patient from array
    patientData.splice(patientIndex, 1);
    
    // Save the updated data
    await saveData();
    
    res.json({ success: true, message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});