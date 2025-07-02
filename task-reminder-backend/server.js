// server.js - FIXED VERSION with chatbot route added
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./config/passport');
const cors = require('cors');

const app = express();

// Connect to MongoDB
connectDB();

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration - CLEAN and simple
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-super-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  
  store: MongoStore.create({
    mongoUrl: 'mongodb://127.0.0.1:27017/taskreminder',
    touchAfter: 24 * 3600,
    ttl: 30 * 24 * 60 * 60, // 30 days
    autoRemove: 'native'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  },
  name: 'taskapp.sid'
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Debug middleware - SIMPLIFIED
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

// Serve static files
app.use(express.static('public'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/taskroutes'));
// FIXED: Add the missing chatbot route
app.use('/api/chatbot', require('./routes/chatbot'));

// Auth check endpoint - SIMPLIFIED
app.get('/api/auth/me', (req, res) => {
  console.log('🔍 Auth check for session:', req.sessionID);
  
  if (req.isAuthenticated() && req.user) {
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 Chatbot available at: /api/chatbot`);
});