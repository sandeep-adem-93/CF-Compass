const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  resourceType: { type: String, required: true },
  id: { type: String, required: true, unique: true },
  name: [{
    given: [String],
    family: String
  }],
  gender: String,
  birthDate: String,
  variants: [String],
  summary: String,
  details: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Patient', patientSchema); 