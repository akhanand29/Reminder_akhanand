// ============================================================================
// USER MODEL - MongoDB Schema Definition
// ============================================================================
// Defines the user data structure for authentication and profile management
// Supports OAuth providers (Google, GitHub) with flexible provider system

const mongoose = require('mongoose');

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

const userSchema = new mongoose.Schema({
  // -------------------------------------------------------------------------
  // BASIC USER INFORMATION
  // -------------------------------------------------------------------------
  username: {
    type: String,
    required: true,
    trim: true,
    maxlength: 30
  },
  
  email: {
    type: String,
    required: true,
    lowercase: true        // Automatically converts to lowercase
  },
  
  avatar: {
    type: String           // Profile picture URL - optional
  },

  // -------------------------------------------------------------------------
  // OAUTH PROVIDER MANAGEMENT
  // -------------------------------------------------------------------------
  // Supports multiple OAuth providers per user (Google, GitHub, etc.)
  providers: [{
    provider: {
      type: String,
      enum: ['google', 'github'],    // Supported OAuth providers
      required: true
    },
    
    providerId: {
      type: String,
      required: true                 // Unique ID from OAuth provider
    },
    
    providerData: {
      type: Object                   // Store additional provider-specific data
    }
  }],

  // -------------------------------------------------------------------------
  // TIMESTAMPS
  // -------------------------------------------------------------------------
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  lastLogin: {
    type: Date                       // Updated on each successful login
  }
});

// ============================================================================
// DATABASE INDEXES
// ============================================================================
// Optimizes database queries and ensures data integrity

// Ensure unique provider combinations (prevent duplicate OAuth accounts)
userSchema.index({ 'providers.provider': 1, 'providers.providerId': 1 }, { unique: true });

// Fast email lookups for authentication
userSchema.index({ email: 1 });

// ============================================================================
// EXPORT MODEL
// ============================================================================

module.exports = mongoose.model('User', userSchema);