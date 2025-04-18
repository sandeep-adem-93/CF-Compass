const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  resourceType: {
    type: String,
    required: true,
    default: 'Patient'
  },
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: [{
    given: [String],
    family: String,
    text: String
  }],
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'unknown', 'non-binary'],
    required: true
  },
  birthDate: {
    type: String
  },
  variants: [{
    type: String
  }],
  geneticSummary: {
    type: String
  },
  clinicalDetails: {
    type: String
  },
  analysisProvider: {
    type: String,
    default: 'test'
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Patient', PatientSchema); 