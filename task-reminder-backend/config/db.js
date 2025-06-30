/**
 * DATABASE CONNECTION MODULE
 * =========================
 * Handles MongoDB connection using Mongoose
 * Provides connection establishment and error handling
 */

// =============================================================================
// DEPENDENCIES
// =============================================================================
const mongoose = require('mongoose');

// =============================================================================
// DATABASE CONNECTION FUNCTION
// =============================================================================

/**
 * Establishes a connection to the MongoDB database
 * 
 * Features:
 * - Async/await pattern for handling asynchronous connection
 * - Error handling with process exit on failure
 * - Modern MongoDB connection options
 * - Visual feedback via console logging
 * 
 * @returns {Promise<void>} Resolves when connection is established
 */
const connectDB = async () => {
  try {
    // ==========================================================================
    // CONNECTION ATTEMPT
    // ==========================================================================
    
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
    
    // ==========================================================================
    // SUCCESS HANDLING
    // ==========================================================================
    
    // Log successful connection with visual indicator
    console.log('✅ MongoDB connected');
    
  } catch (err) {
    // ==========================================================================
    // ERROR HANDLING
    // ==========================================================================
    
    // Handle connection errors
    console.error('❌ MongoDB connection error:', err.message);
    
    // Exit the Node.js process with failure code (1)
    // This prevents the application from running without a database connection
    process.exit(1);
  }
};

// =============================================================================
// MODULE EXPORTS
// =============================================================================

// Export the function so it can be imported and used in other files
module.exports = connectDB;
