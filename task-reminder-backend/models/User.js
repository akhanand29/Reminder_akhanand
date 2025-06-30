const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  avatar: {
    type: String // Profile picture URL
  },
  providers: [{
    provider: {
      type: String,
      enum: ['google', 'github'],
      required: true
    },
    providerId: {
      type: String,
      required: true
    },
    providerData: {
      type: Object // Store additional provider data
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
});

// Ensure unique provider combinations
userSchema.index({ 'providers.provider': 1, 'providers.providerId': 1 }, { unique: true });
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);