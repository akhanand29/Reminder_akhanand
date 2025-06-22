// Import required dependencies
const express = require('express');           // Web framework for Node.js
const cors = require('cors');                 // Cross-Origin Resource Sharing middleware
const connectDB = require('./config/db');     // Database connection function
const taskRoutes = require('./routes/taskroutes'); // Task-related API routes
require('dotenv').config();                   // Load environment variables from .env file
const chatbotRoutes = require('./routes/chatbot'); // Chatbot-related API routes

// Initialize Express application
const app = express();
const PORT = 3000; // Server port number

// Establish database connection
connectDB();

// Middleware setup
app.use(cors());           // Enable CORS for all routes (allows cross-origin requests)
app.use(express.json());   // Parse incoming JSON requests and make data available in req.body

// Route handlers
app.use('/api/chatbot', chatbotRoutes); // Mount chatbot routes at /api/chatbot endpoint
app.use('/api/tasks', taskRoutes);      // Mount task routes at /api/tasks endpoint

// 404 handler - catches all unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});





// Start the server and listen on the defined PORT