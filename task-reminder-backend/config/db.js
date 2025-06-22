// Import the Mongoose library for MongoDB object modeling
const mongoose = require('mongoose');

/**
 * Establishes a connection to the MongoDB database
 * Uses async/await pattern for handling the asynchronous connection
 */
const connectDB = async () => {
  try {
    // Attempt to connect to the local MongoDB instance
    // Connection string breakdown:
    // - mongodb:// = MongoDB protocol
    // - 127.0.0.1:27017 = localhost on default MongoDB port
    // - taskreminder = database name
    await mongoose.connect('mongodb://127.0.0.1:27017/taskreminder', {
      // Parse connection string using new URL parser (recommended for MongoDB 3.1.0+)
      useNewUrlParser: true,
      // Use new Server Discovery and Monitoring engine (recommended for MongoDB 3.2.1+)
      useUnifiedTopology: true,
    });
    
    // Log successful connection with visual indicator
    console.log('✅ MongoDB connected');
    
  } catch (err) {
    // Handle connection errors
    console.error('❌ MongoDB connection error:', err.message);
    
    // Exit the Node.js process with failure code (1)
    // This prevents the application from running without a database connection
    process.exit(1);
  }
};

// Export the function so it can be imported and used in other files
module.exports = connectDB;

