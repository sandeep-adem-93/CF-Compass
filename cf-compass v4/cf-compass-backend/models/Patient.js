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
  name: {
    type: String,
    required: true
  },
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
  clinicalDetails: [{
    type: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true
    },
    status: String,
    value: mongoose.Schema.Types.Mixed
  }],
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