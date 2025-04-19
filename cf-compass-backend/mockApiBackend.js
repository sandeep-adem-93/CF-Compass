const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const connectDB = require('./config/db');
const Patient = require('./models/Patient');
const initializeDatabase = require('./scripts/initDb');
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB connection options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50,
  retryWrites: true,
  w: 'majority',
  family: 4
};

let isConnecting = false;
let connectionRetryTimeout;

// Connect to MongoDB and initialize database
const connectWithRetry = async () => {
  if (isConnecting) {
    console.log('Connection attempt already in progress...');
    return;
  }

  try {
    isConnecting = true;
    clearTimeout(connectionRetryTimeout);

    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      isConnecting = false;
      return;
    }

    console.log('Attempting to connect to MongoDB...');
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
    console.log('MongoDB connected successfully');
    
    // Initialize database with sample data if empty
    const patientCount = await Patient.countDocuments({});
    if (patientCount === 0) {
      console.log('Database is empty, initializing with sample data...');
      try {
        await initializeDatabase();
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Error during database initialization:', error);
      }
    } else {
      console.log(`Database contains ${patientCount} patients, skipping initialization`);
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
    isConnecting = false;
    connectionRetryTimeout = setTimeout(connectWithRetry, 5000);
  } finally {
    isConnecting = false;
  }
};

// Initial connection attempt
connectWithRetry();

// Middleware
app.use(cors({
  origin: ['https://cf-compass-frontend.onrender.com', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'CF Compass API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Validate role
    if (!['geneticcounselor', 'medicalreceptionist'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create new user
    const user = new User({
      username,
      password,
      role,
      permissions: role === 'geneticcounselor' 
        ? ['manage_patients', 'view_patients', 'delete_patients']
        : ['view_patients']
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error handling middleware:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 