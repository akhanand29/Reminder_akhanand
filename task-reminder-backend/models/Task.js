// models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: false
  },
  completed: {
    type: Boolean,
    default: false
  },
  isCompleted: {  // Add this to match frontend
    type: Boolean,
    default: false
  },
  // CRITICAL: This field associates tasks with users
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Date/time functionality
  dueDate: {
    type: Date,
    required: true // Make this required since your frontend requires it
  },
  // Store reminder as minutes before due date (this matches your frontend)
  reminderTime: {
    type: Number,
    default: 15, // Default to 15 minutes before
    min: 0 // Cannot be negative
  },
  // Keep the old field for backward compatibility but make it sync with reminderTime
  reminderMinutesBefore: {
    type: Number,
    default: 15
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Sync reminderTime and reminderMinutesBefore
taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Sync the reminder fields
  if (this.reminderTime !== undefined) {
    this.reminderMinutesBefore = this.reminderTime;
  } else if (this.reminderMinutesBefore !== undefined) {
    this.reminderTime = this.reminderMinutesBefore;
  }
  
  // Sync completed and isCompleted fields
  if (this.isCompleted !== undefined) {
    this.completed = this.isCompleted;
  } else if (this.completed !== undefined) {
    this.isCompleted = this.completed;
  }
  
  next();
});

// Virtual field to calculate actual reminder time based on due date and minutes before
taskSchema.virtual('calculatedReminderTime').get(function() {
  if (this.dueDate && this.reminderTime) {
    return new Date(this.dueDate.getTime() - (this.reminderTime * 60 * 1000));
  }
  return null;
});

module.exports = mongoose.model('Task', taskSchema);