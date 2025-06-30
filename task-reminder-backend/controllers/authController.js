const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to check authentication
const requireAuth = async (req, res, next) => {
  try {
    // Check for session-based auth (Google OAuth)
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      console.log('✅ Session authenticated user:', req.user.email);
      return next();
    }

    // If we get here, user is not authenticated
    console.log('❌ Authentication failed - no valid session');
    return res.status(401).json({ error: 'Please log in to access this resource' });
    
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(401).json({ error: 'Authentication error' });
  }
};

// FIXED: Get current user info - match frontend expectations
const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Return user data in the format frontend expects
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        avatar: req.user.avatar,
        name: req.user.username || req.user.email, // Add name field
        providers: req.user.providers ? req.user.providers.map(p => p.provider) : []
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
};

// FIXED: Better logout handling
const logout = (req, res) => {
  console.log('🚪 Logout requested for user:', req.user ? req.user.email : 'Unknown');
  
  // Use req.logout() for Passport
  req.logout((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    console.log('✅ User logged out from passport');
    
    // Clear any JWT cookies (if you were using them)
    res.clearCookie('token');
    
    // Destroy session completely
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Session destroy error:', err);
        // Still send success response as user is logged out from passport
      } else {
        console.log('✅ Session destroyed successfully');
      }
      
      // Clear the session cookie
      res.clearCookie('connect.sid'); // Default session cookie name
      
      res.json({ 
        message: 'Logged out successfully',
        success: true 
      });
    });
  });
};

module.exports = {
  requireAuth,
  getCurrentUser,
  logout
};