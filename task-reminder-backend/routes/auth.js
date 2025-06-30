// routes/auth.js - FIXED VERSION
const express = require('express');
const passport = require('passport');
const router = express.Router();

// Route to initiate Google OAuth
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Callback route after Google OAuth - FIXED
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login?error=auth_failed',
    session: true,
  }),
  (req, res) => {
    try {
      console.log('✅ Google OAuth success for user:', req.user._id);
      
      // Normalize user data structure - FIXED to match your User model
      const userData = {
        id: req.user._id, // Use _id from MongoDB
        name: req.user.username || req.user.email.split('@')[0],
        email: req.user.email,
        avatar: req.user.avatar || '/default-avatar.png',
        username: req.user.username
      };
      
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
                  window.opener.postMessage({
                    type: 'OAUTH_SUCCESS',
                    user: userData
                  }, window.location.origin);
                  window.close();
                } else {
                  // Fallback: redirect to main app
                  window.location.href = '/?auth=success';
                }
              } catch (error) {
                console.error('Auth callback error:', error);
                window.location.href = '/login?error=callback_failed';
              }
            </script>
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

// Route to get current authenticated user - FIXED
router.get('/me', (req, res) => {
  try {
    console.log('🔍 Auth check - User in session:', req.user ? req.user._id : 'None');
    
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      // Return consistent user data structure
      const userData = {
        id: req.user._id,
        name: req.user.username || req.user.email.split('@')[0],
        username: req.user.username,
        email: req.user.email,
        avatar: req.user.avatar || '/default-avatar.png'
      };
      
      console.log('✅ User authenticated:', userData.id);
      res.json({
        success: true,
        user: userData
      });
    } else {
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

// Logout route - FIXED
router.post('/logout', (req, res) => {
  const userEmail = req.user ? req.user.email : 'Anonymous';
  console.log('🚪 Logout request from:', userEmail);
  
  if (req.user) {
    req.logout((err) => {
      if (err) {
        console.error('❌ Logout error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Logout failed' 
        });
      }
      
      // Destroy session
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error('❌ Session destroy error:', destroyErr);
        }
        
        // Clear cookies
        res.clearCookie('taskapp.sid');
        res.clearCookie('connect.sid');
        
        console.log('✅ User logged out successfully:', userEmail);
        
        res.json({ 
          success: true, 
          message: 'Logged out successfully' 
        });
      });
    });
  } else {
    res.json({ 
      success: true, 
      message: 'Already logged out' 
    });
  }
});

module.exports = router;