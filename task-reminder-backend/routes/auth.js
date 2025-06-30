// ============================================================================
// AUTHENTICATION ROUTES - OAuth and Session Management
// ============================================================================
// Handles Google OAuth flow, user authentication, and session management
// Supports popup-based authentication with postMessage communication

const express = require('express');
const passport = require('passport');
const router = express.Router();

// ============================================================================
// GOOGLE OAUTH INITIATION
// ============================================================================

/**
 * Initiates Google OAuth flow
 * Redirects user to Google's authorization server
 */
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// ============================================================================
// GOOGLE OAUTH CALLBACK HANDLER
// ============================================================================

/**
 * Handles callback from Google OAuth
 * Processes authentication result and communicates with popup window
 */
router.get('/google/callback',
  // Passport authentication middleware
  passport.authenticate('google', {
    failureRedirect: '/login?error=auth_failed',
    session: true,
  }),
  
  // Success handler
  (req, res) => {
    try {
      console.log('✅ Google OAuth success for user:', req.user._id);
      
      // -------------------------------------------------------------------------
      // NORMALIZE USER DATA STRUCTURE
      // -------------------------------------------------------------------------
      // Create consistent user data format for frontend
      const userData = {
        id: req.user._id,                                    // MongoDB ObjectId
        name: req.user.username || req.user.email.split('@')[0],  // Display name fallback
        email: req.user.email,
        avatar: req.user.avatar || '/default-avatar.png',   // Avatar with fallback
        username: req.user.username
      };
      
      // -------------------------------------------------------------------------
      // POPUP WINDOW COMMUNICATION
      // -------------------------------------------------------------------------
      // Send HTML response that communicates with parent window via postMessage
      res.send(`
        <html>
          <head>
            <title>Authentication Success</title>
          </head>
          <body>
            <script>
              const userData = ${JSON.stringify(userData)};
              try {
                if (window.opener) {
                  // Send success message to parent window
                  window.opener.postMessage({
                    type: 'OAUTH_SUCCESS',
                    user: userData
                  }, window.location.origin);
                  window.close();
                } else {
                  // Fallback: redirect to main app if no parent window
                  window.location.href = '/?auth=success';
                }
              } catch (error) {
                console.error('Auth callback error:', error);
                window.location.href = '/login?error=callback_failed';
              }
            </script>
            
            <!-- Fallback UI for users who have JavaScript disabled -->
            <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
              <h2>Login Successful!</h2>
              <p>Welcome ${userData.name}!</p>
              <p>This window should close automatically...</p>
              <p>If it doesn't, <a href="/">click here to continue</a></p>
            </div>
          </body>
        </html>
      `);
      
    } catch (error) {
      console.error('❌ Auth callback server error:', error);
      res.redirect('/login?error=server_error');
    }
  }
);

// ============================================================================
// AUTHENTICATION STATUS CHECK
// ============================================================================

/**
 * Returns current user authentication status and user data
 * Used by frontend to check if user is logged in
 */
router.get('/me', (req, res) => {
  try {
    console.log('🔍 Auth check - User in session:', req.user ? req.user._id : 'None');
    
    // -------------------------------------------------------------------------
    // VERIFY AUTHENTICATION
    // -------------------------------------------------------------------------
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      
      // Create consistent user data structure
      const userData = {
        id: req.user._id,
        name: req.user.username || req.user.email.split('@')[0],
        username: req.user.username,
        email: req.user.email,
        avatar: req.user.avatar || '/default-avatar.png'
      };
      
      console.log('✅ User authenticated:', userData.id);
      
      // Return success response with user data
      res.json({
        success: true,
        user: userData
      });
      
    } else {
      // -------------------------------------------------------------------------
      // NOT AUTHENTICATED
      // -------------------------------------------------------------------------
      console.log('❌ User not authenticated');
      res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }
    
  } catch (error) {
    console.error('❌ Error fetching user data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// ============================================================================
// USER LOGOUT
// ============================================================================

/**
 * Logs out the current user and destroys session
 * Clears all authentication cookies and session data
 */
router.post('/logout', (req, res) => {
  const userEmail = req.user ? req.user.email : 'Anonymous';
  console.log('🚪 Logout request from:', userEmail);
  
  // -------------------------------------------------------------------------
  // LOGOUT PROCESS
  // -------------------------------------------------------------------------
  if (req.user) {
    // Passport logout
    req.logout((err) => {
      if (err) {
        console.error('❌ Logout error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Logout failed' 
        });
      }
      
      // -------------------------------------------------------------------------
      // SESSION CLEANUP
      // -------------------------------------------------------------------------
      // Destroy session data
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error('❌ Session destroy error:', destroyErr);
        }
        
        // Clear authentication cookies
        res.clearCookie('taskapp.sid');
        res.clearCookie('connect.sid');
        
        console.log('✅ User logged out successfully:', userEmail);
        
        // Return success response
        res.json({ 
          success: true, 
          message: 'Logged out successfully' 
        });
      });
    });
    
  } else {
    // -------------------------------------------------------------------------
    // ALREADY LOGGED OUT
    // -------------------------------------------------------------------------
    res.json({ 
      success: true, 
      message: 'Already logged out' 
    });
  }
});

// ============================================================================
// EXPORT ROUTER
// ============================================================================

module.exports = router;