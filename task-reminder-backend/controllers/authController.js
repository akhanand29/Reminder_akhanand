/**
 * AUTHENTICATION CONTROLLER
 * =========================
 * Handles authentication middleware and user session management
 * Provides endpoints for user info and logout functionality
 */

// =============================================================================
// DEPENDENCIES
// =============================================================================
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * Authentication Middleware
 * 
 * Purpose: Verify user authentication before allowing access to protected routes
 * Method: Session-based authentication (Passport.js)
 * 
 * Flow:
 * 1. Check if user has valid session authentication
 * 2. If authenticated, proceed to next middleware
 * 3. If not authenticated, return 401 error
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const requireAuth = async (req, res, next) => {
  try {
    // ==========================================================================
    // SESSION-BASED AUTHENTICATION CHECK
    // ==========================================================================
    
    // Check for session-based auth (Google OAuth)
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      console.log('✅ Session authenticated user:', req.user.email);
      return next();
    }

    // ==========================================================================
    // AUTHENTICATION FAILURE
    // ==========================================================================
    
    // If we get here, user is not authenticated
    console.log('❌ Authentication failed - no valid session');
    return res.status(401).json({ error: 'Please log in to access this resource' });
    
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(401).json({ error: 'Authentication error' });
  }
};

// =============================================================================
// USER INFO ENDPOINT
// =============================================================================

/**
 * Get Current User Information
 * 
 * Purpose: Return current authenticated user's information
 * Format: Matches frontend expectations for user data structure
 * 
 * Response Format:
 * {
 *   user: {
 *     id: string,
 *     username: string,
 *     email: string,
 *     avatar: string,
 *     name: string,
 *     providers: string[]
 *   }
 * }
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCurrentUser = async (req, res) => {
  try {
    // ==========================================================================
    // AUTHENTICATION CHECK
    // ==========================================================================
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // ==========================================================================
    // FORMAT USER DATA FOR FRONTEND
    // ==========================================================================
    
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

// =============================================================================
// LOGOUT FUNCTIONALITY
// =============================================================================

/**
 * User Logout Handler
 * 
 * Purpose: Completely log out user and clean up session data
 * 
 * Process:
 * 1. Use Passport's logout method
 * 2. Destroy session completely
 * 3. Clear session cookies
 * 4. Return success response
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logout = (req, res) => {
  console.log('🚪 Logout requested for user:', req.user ? req.user.email : 'Unknown');
  
  // ==========================================================================
  // PASSPORT LOGOUT
  // ==========================================================================
  
  // Use req.logout() for Passport
  req.logout((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    console.log('✅ User logged out from passport');
    
    // ==========================================================================
    // COOKIE CLEANUP
    // ==========================================================================
    
    // Clear any JWT cookies (if you were using them)
    res.clearCookie('token');
    
    // ==========================================================================
    // SESSION DESTRUCTION
    // ==========================================================================
    
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
      
      // ==========================================================================
      // SUCCESS RESPONSE
      // ==========================================================================
      
      res.json({ 
        message: 'Logged out successfully',
        success: true 
      });
    });
  });
};

// =============================================================================
// MODULE EXPORTS
// =============================================================================
module.exports = {
  requireAuth,
  getCurrentUser,
  logout
};