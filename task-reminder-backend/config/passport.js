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
  done(null, user._id.toString()); // Convert to string for consistency
});

// Deserialize user from session - retrieve full user object
passport.deserializeUser(async (id, done) => {
  try {
    console.log('Deserializing user ID:', id, 'Type:', typeof id);
    
    // Ensure we have a valid ID
    if (!id) {
      console.log('No user ID provided');
      return done(null, false);
    }
    
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

module.exports = passport;