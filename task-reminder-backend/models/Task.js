/**
 * TASK MODEL DEFINITION
 * =====================
 * Mongoose schema for task documents in MongoDB
 * Handles task data structure, validation, and field synchronization
 */

// =============================================================================
// DEPENDENCIES
// =============================================================================
const mongoose = require('mongoose');

// =============================================================================
// TASK SCHEMA DEFINITION
// =============================================================================

/**
 * Task Schema
 * 
 * Purpose: Define structure and validation for task documents
 * Features: Field validation, default values, user association, timestamp management
 * Compatibility: Includes duplicate fields for frontend/backend compatibility
 */
const taskSchema = new mongoose.Schema({
  
  // ==========================================================================
  // BASIC TASK INFORMATION
  // ==========================================================================
  
  /**
   * Task Title
   * - Required field
   * - Main identifier for the task
   */
  title: {
    type: String,
    required: true
  },
  
  /**
   * Task Description
   * - Optional detailed information about the task
   * - Provides additional context
   */
  description: {
    type: String,
    required: false
  },
  
  // ==========================================================================
  // COMPLETION STATUS (Dual Fields for Compatibility)
  // ==========================================================================
  
  /**
   * Completion Status (Backend Format)
   * - Boolean indicating if task is completed
   * - Default: false (new tasks are incomplete)
   */
  completed: {
    type: Boolean,
    default: false
  },
  
  /**
   * Completion Status (Frontend Format)
   * - Duplicate field to match frontend expectations
   * - Automatically synced with 'completed' field
   */
  isCompleted: {
    type: Boolean,
    default: false
  },
  
  // ==========================================================================
  // USER ASSOCIATION (CRITICAL for Data Isolation)
  // ==========================================================================
  
  /**
   * User ID Reference
   * - CRITICAL: Associates tasks with specific users
   * - Required field for data security
   * - References User model
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // ==========================================================================
  // DATE AND TIME MANAGEMENT
  // ==========================================================================
  
  /**
   * Due Date
   * - When the task should be completed
   * - Required field (frontend dependency)
   * - Used for sorting and reminder calculations
   */
  dueDate: {
    type: Date,
    required: true // Make this required since your frontend requires it
  },
  
  // ==========================================================================
  // REMINDER SYSTEM (Dual Fields for Compatibility)
  // ==========================================================================
  
  /**
   * Reminder Time (Primary)
   * - Minutes before due date to remind user
   * - Default: 15 minutes before
   * - Minimum: 0 (cannot be negative)
   */
  reminderTime: {
    type: Number,
    default: 15, // Default to 15 minutes before
    min: 0 // Cannot be negative
  },
  
  /**
   * Reminder Minutes Before (Compatibility)
   * - Legacy field for backward compatibility
   * - Automatically synced with reminderTime
   */
  reminderMinutesBefore: {
    type: Number,
    default: 15
  },
  
  // ==========================================================================
  // TIMESTAMP MANAGEMENT
  // ==========================================================================
  
  /**
   * Creation Timestamp
   * - When the task was created
   * - Automatically set on document creation
   */
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  /**
   * Last Update Timestamp
   * - When the task was last modified
   * - Automatically updated on save
   */
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// =============================================================================
// MIDDLEWARE (Pre-Save Hooks)
// =============================================================================

/**
 * Pre-Save Middleware
 * 
 * Purpose: Synchronize fields and update timestamps before saving
 * 
 * Functions:
 * 1. Update the updatedAt timestamp
 * 2. Sync reminder time fields
 * 3. Sync completion status fields
 */
taskSchema.pre('save', function(next) {
  // ==========================================================================
  // TIMESTAMP UPDATE
  // ==========================================================================
  
  this.updatedAt = Date.now();
  
  // ==========================================================================
  // REMINDER FIELDS SYNCHRONIZATION
  // ==========================================================================
  
  // Sync the reminder fields (bidirectional)
  if (this.reminderTime !== undefined) {
    this.reminderMinutesBefore = this.reminderTime;
  } else if (this.reminderMinutesBefore !== undefined) {
    this.reminderTime = this.reminderMinutesBefore;
  }
  
  // ==========================================================================
  // COMPLETION STATUS SYNCHRONIZATION
  // ==========================================================================
  
  // Sync completed and isCompleted fields (bidirectional)
  if (this.isCompleted !== undefined) {
    this.completed = this.isCompleted;
  } else if (this.completed !== undefined) {
    this.isCompleted = this.completed;
  }
  
  next();
});

// =