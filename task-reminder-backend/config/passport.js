const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let user = await User.findOne({
      'providers.provider': 'google',
      'providers.providerId': profile.id
    });

    if (user) {
      // User exists, update last login
      user.lastLogin = new Date();
      await user.save();
      console.log('Existing user logged in:', user._id);
      return done(null, user);
    }

    // Check if user exists with same email from different provider
    user = await User.findOne({ email: profile.emails[0].value });

    if (user) {
      // Add Google provider to existing user
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

    // Create new user
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

// Serialize user for session - store user ID
passport.serializeUser((user, done) => {
  console.log('Serializing user:', user._id);
  done(null, user._id.toString());
});

// Deserialize user from session - retrieve full user object
passport.deserializeUser(async (id, done) => {
  try {
    console.log('Deserializing user ID:', id, 'Type:', typeof id);
    
    // Validate the ID format (assuming MongoDB ObjectId)
    if (!id || typeof id !== 'string' || !id.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Invalid user ID format:', id);
      return done(new Error('Invalid user ID'), null);
    }
    
    const user = await User.findById(id);
    
    if (!user) {
      console.log('User not found for ID:', id);
      // Return an error to clear the session and prevent infinite loop
      return done(new Error('User not found'), null);
    }
    
    console.log('User found during deserialization:', user._id, user.username);
    done(null, user);
    
  } catch (error) {
    console.error('Deserialization error:', error);
    // Return the actual error to clear the invalid session
    done(error, null);
  }
});

module.exports = passport;