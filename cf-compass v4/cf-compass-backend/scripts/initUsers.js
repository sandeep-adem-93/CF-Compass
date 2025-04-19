const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createInitialUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Create genetic counselor user
    const geneticCounselor = new User({
      username: 'genetic',
      password: 'genetic123', // This will be hashed automatically by the User model
      role: 'genetic_counselor'
    });

    // Create medical receptionist user
    const receptionist = new User({
      username: 'receptionist',
      password: 'receptionist123', // This will be hashed automatically by the User model
      role: 'medical_receptionist'
    });

    // Save users
    await geneticCounselor.save();
    await receptionist.save();

    console.log('Default users created successfully');
  } catch (error) {
    console.error('Error creating default users:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
  }
};

createInitialUsers(); 