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