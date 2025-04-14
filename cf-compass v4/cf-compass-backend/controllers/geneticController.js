// cf-compass-backend/controllers/geneticController.js
const geneticService = require('../services/geneticService');

// Process uploaded CFTR sequence
const processSequence = (req, res) => {
  try {
    const { sequenceData } = req.body;
    
    if (!sequenceData) {
      return res.status(400).json({ success: false, error: 'No sequence data provided' });
    }
    
    const result = geneticService.processGeneticData(sequenceData);
    res.json(result);
  } catch (error) {
    console.error('Error in processSequence controller:', error);
    res.status(500).json({ success: false, error: 'Server error processing sequence' });
  }
};

module.exports = {
  processSequence
};