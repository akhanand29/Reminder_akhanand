/**
 * PASSPORT AUTHENTICATION CONFIGURATION
 * ====================================
 * Configures Passport.js for OAuth authentication strategies
 * Handles user serialization/deserialization for sessions
 */

// =============================================================================
// DEPENDENCIES
// =============================================================================
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

// =============================================================================
// GOOGLE OAUTH STRATEGY CONFIGURATION
// =============================================================================

/**
 * Google OAuth 2.0 Strategy
 * 
 * Flow:
 * 1. Check if user exists with Google ID
 * 2. If exists, update last login and return user
 * 3. If not exists but email matches another provider, add Google to existing user
 * 4. If completely new user, create new user record
 */
passport.use(new GoogleStrategy({
  // OAuth application credentials from environment variables
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // ==========================================================================
    // STEP 1: CHECK FOR EXISTING USER WITH GOOGLE ID
    // ==========================================================================
    
    // Check if user already exists with this Google ID
    let user = await User.findOne({
      'providers.provider': 'google',
      'providers.providerId': profile.id
    });

    if (user) {
      // User exists, update last login timestamp
      user.lastLogin = new Date();
      await user.save();
      console.log('Existing user logged in:', user._id);
      return done(null, user);
    }

    // ==========================================================================
    // STEP 2: CHECK FOR EXISTING USER WITH SAME EMAIL
    // ==========================================================================
    
    // Check if user exists with same email from different provider
    user = await User.findOne({ email: profile.emails[0].value });

    if (user) {
      // Add Google provider to existing user (account linking)
      user.providers.push({
        provider: 'google',
        providerId: profile.id,
        providerData: {
          name: profile.displayName,
          photo: profile.photos[0]?.value
        }
      });
      user.lastLogin = new Date();
      await user.save();
      console.log('Added Google provider to existing user:', user._id);
      return done(null, user);
    }

    // ==========================================================================
    // STEP 3: CREATE NEW USER
    // ==========================================================================
    
    // Create new user record
    user = new User({
      username: profile.displayName || profile.emails[0].value.split('@')[0],
      email: profile.emails[0].value,
      avatar: profile.photos[0]?.value,
      providers: [{
        provider: 'google',
        providerId: profile.id,
        providerData: {
          name: profile.displayName,
          photo: profile.photos[0]?.value
        }
      }],
      lastLogin: new Date()
    });

    await user.save();
    console.log('New user created:', user._id);
    done(null, user);
    
  } catch (error) {
    console.error('Google OAuth error:', error);
    done(error, null);
  }
}));

// =============================================================================
// SESSION SERIALIZATION
// =============================================================================

/**
 * Serialize user for session storage
 * 
 * Purpose: Store minimal user identifier in session
 * What gets stored: Only the user's MongoDB ObjectId as string
 * 
 * @param {Object} user - Full user object from database
 * @param {Function} done - Callback function
 */
passport.serializeUser((user, done) => {
  console.log('Serializing user:', user._id);
  done(null, user._id.toString()); // Convert to string for consistency
});

/**
 * Deserialize user from session storage
 * 
 * Purpose: Retrieve full user object from stored identifier
 * Input: User ID string from session
 * Output: Complete user object or false if not found
 * 
 * @param {string} id - User ID from session
 * @param {Function} done - Callback function
 */
passport.deserializeUser(async (id, done) => {
  try {
    console.log('Deserializing user ID:', id, 'Type:', typeof id);
    
    // ==========================================================================
    // VALIDATION
    // ==========================================================================
    
    // Ensure we have a valid ID
    if (!id) {
      console.log('No user ID provided');
      return done(null, false);
    }
    
    // ==========================================================================
    // USER LOOKUP
    // ==========================================================================
    
    const user = await User.findById(id);
    if (user) {
      console.log('User found during deserialization:', user._id, user.username);
      done(null, user);
    } else {
      console.log('User not found for ID:', id);
      done(null, false); // Changed from error to false
    }
    
  } catch (error) {
    console.error('Deserialization error:', error);
    done(null, false); // Changed from error to false
  }
});

// =============================================================================
// MODULE EXPORTS
// =============================================================================
module.exports = passport;