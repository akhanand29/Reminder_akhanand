/**
 * Express Server Configuration
 * 
 * Main server file that sets up the Express application with:
 * - Database connection
 * - Session management with MongoDB store
 * - Passport authentication
 * - CORS configuration
 * - Route handling
 * - Error handling
 * 
 * Environment: Supports both development and production configurations
 */

// ============================================================================
// DEPENDENCIES & CONFIGURATION
// ============================================================================
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./config/passport');
const cors = require('cors');

const app = express();

// ============================================================================
// DATABASE CONNECTION
// ============================================================================
connectDB();

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

/**
 * CORS Configuration
 * Allows cross-origin requests from the client application
 * Enables credentials for session-based authentication
 */
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

/**
 * Body Parsing Middleware
 * Handles JSON and URL-encoded request bodies
 */
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/**
 * Session Configuration
 * 
 * Uses MongoDB for session storage with the following features:
 * - Persistent sessions across server restarts
 * - Automatic session cleanup
 * - Security-appropriate cookie settings
 * - Environment-specific configurations
 */
app.use(session({
  // Session security
  secret: process.env.SESSION_SECRET || 'your-super-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  
  // MongoDB session store configuration
  store: MongoStore.create({
    mongoUrl: 'mongodb://127.0.0.1:27017/taskreminder',
    touchAfter: 24 * 3600,           // Lazy session update (24 hours)
    ttl: 30 * 24 * 60 * 60,          // Session TTL: 30 days
    autoRemove: 'native'             // Let MongoDB handle cleanup
  }),
  
  // Cookie configuration
  cookie: {
    secure: process.env.NODE_ENV === 'production',     // HTTPS only in production
    httpOnly: true,                                    // Prevent XSS attacks
    maxAge: 30 * 24 * 60 * 60 * 1000,                // 30 days lifetime
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'  // Cross-site policy
  },
  
  // Custom session name
  name: 'taskapp.sid'
}));

/**
 * Passport Authentication Middleware
 * Initializes Passport and enables persistent login sessions
 */
app.use(passport.initialize());
app.use(passport.session());

/**
 * Debug Middleware
 * 
 * Logs detailed information about API requests including:
 * - HTTP method and URL
 * - Session information
 * - Authentication state
 * - User details
 * 
 * Only activates for API routes to reduce noise
 */
app.use((req, res, next) => {
  if (req.url.includes('/api/')) {
    console.log('🔍 API Request:', {
      method: req.method,
      url: req.url,
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      userID: req.user ? req.user._id : 'No user',
      userEmail: req.user ? req.user.email : 'No email'
    });
  }
  next();
});

/**
 * Static File Serving
 * Serves static assets from the public directory
 */
app.use(express.static('public'));

// ============================================================================
// ROUTE CONFIGURATION
// ============================================================================

/**
 * Authentication Routes
 * Handles login, logout, registration, and OAuth flows
 */
app.use('/api/auth', require('./routes/auth'));

/**
 * Task Management Routes
 * Handles all CRUD operations for user tasks
 */
app.use('/api/tasks', require('./routes/taskroutes'));

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /api/auth/me
 * 
 * Authentication Status Endpoint
 * Returns current user information if authenticated
 * Used by frontend to check authentication state
 */
app.get('/api/auth/me', (req, res) => {
  console.log('🔍 Auth check for session:', req.sessionID);
  
  if (req.isAuthenticated() && req.user) {
    // Return sanitized user data
    res.json({ 
      success: true, 
      user: {
        id: req.user._id,
        email: req.user.email,
        username: req.user.username,
        avatar: req.user.avatar
      },
      sessionId: req.sessionID
    });
  } else {
    res.status(401).json({ success: false, message: 'Not authenticated' });
  }
});

/**
 * GET /api/health
 * 
 * Health Check Endpoint
 * Provides server status information for monitoring
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Global Error Handler
 * Catches and logs all unhandled errors
 * Returns generic error response to prevent information leakage
 */
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

/**
 * 404 Handler
 * Handles requests to non-existent routes
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

/**
 * Start the Express server
 * Listens on configured port with startup logging
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
});