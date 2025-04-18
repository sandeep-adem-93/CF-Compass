const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cf-compass';
    console.log('Attempting to connect to MongoDB with URI:', mongoURI);
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB connected successfully');
    console.log('MongoDB connection state:', mongoose.connection.readyState);
    
    // Check if database is empty
    const Patient = mongoose.model('Patient');
    const count = await Patient.countDocuments({});
    console.log(`Current number of patients in database: ${count}`);
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB; 