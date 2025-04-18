const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  dob: { type: String, required: true },
  gender: { type: String, required: true },
  variants: [String],
  status: { type: String, default: 'Active' },
  summary: String,
  details: String,
  aiProvider: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Patient', patientSchema); 