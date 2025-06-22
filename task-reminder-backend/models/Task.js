// Import Mongoose library for MongoDB object modeling
const mongoose = require('mongoose');

// Define the structure/schema for Task documents in MongoDB
const taskSchema = new mongoose.Schema({
  // Task title - required field
  title: { 
    type: String,        // Data type: string
    required: true       // This field must be provided when creating a task
  },
  
  // Task description - optional field
  description: String,   // Shorthand syntax: just specify the type (String)
  
  // Due date for the task - stored as string
  // Note: Consider using Date type for better date operations
  dueDate: String,
  
  // Time when reminder should be triggered - stored as string
  // Note: Consider using Date type for better time operations
  reminderTime: String,
  
  // Completion status of the task
  isCompleted: { 
    type: Boolean,       // Data type: boolean (true/false)
    default: false       // Default value when task is created (not completed)
  },
});

// Create and export the Task model
// Parameters:
// 1. 'Task' - Model name (used for references and will be pluralized to 'tasks')
// 2. taskSchema - The schema definition created above
// 3. 'tasks' - Explicit collection name in MongoDB (overrides default pluralization)
module.exports = mongoose.model('Task', taskSchema, 'tasks');
