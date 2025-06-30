/**
 * TASK CONTROLLERS MODULE
 * =======================
 * Handles CRUD operations for tasks with user-specific data isolation
 * All operations are DATABASE-ONLY (no localStorage integration)
 */

// =============================================================================
// DEPENDENCIES
// =============================================================================
const Task = require('../models/Task');
const mongoose = require('mongoose');

// =============================================================================
// TASK RETRIEVAL
// =============================================================================

/**
 * Get All Tasks for Authenticated User
 * 
 * Purpose: Retrieve all tasks belonging to the current authenticated user
 * Security: Only returns tasks associated with the user's ID
 * Sorting: Most recent tasks first (createdAt descending)
 * 
 * @param {Object} req - Express request object (contains user info)
 * @param {Object} res - Express response object
 */
const getTasks = async (req, res) => {
  try {
    // ==========================================================================
    // AUTHENTICATION VALIDATION
    // ==========================================================================
    
    // Ensure user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('Getting tasks for user:', req.user._id);
    
    // ==========================================================================
    // DATABASE QUERY
    // ==========================================================================
    
    // Get tasks from database ONLY - filtered by user ID
    const tasks = await Task.find({ userId: req.user._id }).sort({ createdAt: -1 });
    console.log('Tasks found in database:', tasks.length);
    
    // ==========================================================================
    // RESPONSE
    // ==========================================================================
    
    res.json({
      tasks: tasks,
      count: tasks.length,
      userId: req.user._id
    });
    
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

// =============================================================================
// TASK CREATION
// =============================================================================

/**
 * Create New Task
 * 
 * Purpose: Create a new task associated with the authenticated user
 * Security: Automatically associates task with user ID
 * Validation: Ensures user is authenticated before creation
 * 
 * @param {Object} req - Express request object (contains task data and user info)
 * @param {Object} res - Express response object
 */
const createTask = async (req, res) => {
  try {
    // ==========================================================================
    // AUTHENTICATION VALIDATION
    // ==========================================================================
    
    // Ensure user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('Creating task for user:', req.user._id);
    
    // ==========================================================================
    // TASK DATA PREPARATION
    // ==========================================================================
    
    // Create task object with user ID (CRITICAL for data isolation)
    const taskData = {
      ...req.body,
      userId: req.user._id // CRITICAL: Associate with user
    };
    
    console.log("TaskData = ", taskData);
    
    // ==========================================================================
    // DATABASE SAVE
    // ==========================================================================
    
    // Save directly to database
    const task = new Task(taskData);
    const savedTask = await task.save();
    
    console.log('✅ Task saved to database:', savedTask._id);
    
    // ==========================================================================
    // SUCCESS RESPONSE
    // ==========================================================================
    
    res.status(201).json({
      task: savedTask,
      message: 'Task created successfully'
    });
    
  } catch (error) {
    console.error('Create task error:', error);
    res.status(400).json({ error: error.message });
  }
};

// =============================================================================
// TASK UPDATES
// =============================================================================

/**
 * Update Existing Task
 * 
 * Purpose: Update a task that belongs to the authenticated user
 * Security: Only allows updates to user's own tasks
 * Method: Find by both task ID and user ID for security
 * 
 * @param {Object} req - Express request object (contains task ID, updates, and user info)
 * @param {Object} res - Express response object
 */
const updateTask = async (req, res) => {
  try {
    // ==========================================================================
    // AUTHENTICATION VALIDATION
    // ==========================================================================
    
    // Ensure user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('Updating task:', req.params.id, 'for user:', req.user._id);
    
    // ==========================================================================
    // DATABASE UPDATE WITH SECURITY CHECK
    // ==========================================================================
    
    // Find and update task in database (ensure it belongs to user)
    const task = await Task.findOneAndUpdate(
      { 
        _id: req.params.id, 
        userId: req.user._id // CRITICAL: Only update user's own tasks
      },
      req.body,
      { new: true } // Return updated document
    );
    
    // ==========================================================================
    // VALIDATION & RESPONSE
    // ==========================================================================
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }
    
    console.log('✅ Task updated in database');
    
    res.json({
      task: task,
      message: 'Task updated successfully'
    });
    
  } catch (error) {
    console.error('Update task error:', error);
    res.status(400).json({ error: error.message });
  }
};

// =============================================================================
// TASK DELETION
// =============================================================================

/**
 * Delete Task
 * 
 * Purpose: Remove a task that belongs to the authenticated user
 * Security: Only allows deletion of user's own tasks
 * Method: Find by both task ID and user ID for security
 * 
 * @param {Object} req - Express request object (contains task ID and user info)
 * @param {Object} res - Express response object
 */
const deleteTask = async (req, res) => {
  try {
    // ==========================================================================
    // AUTHENTICATION VALIDATION
    // ==========================================================================
    
    // Ensure user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('Deleting task:', req.params.id, 'for user:', req.user._id);
    
    // ==========================================================================
    // DATABASE DELETION WITH SECURITY CHECK
    // ==========================================================================
    
    // Find and delete task from database (ensure it belongs to user)
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id // CRITICAL: Only delete user's own tasks
    });
    
    // ==========================================================================
    // VALIDATION & RESPONSE
    // ==========================================================================
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }
    
    console.log('✅ Task deleted from database');
    
    res.json({ 
      message: 'Task deleted successfully',
      deletedTask: task
    });
    
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

// =============================================================================
// SINGLE TASK RETRIEVAL
// =============================================================================

/**
 * Get Single Task
 * 
 * Purpose: Retrieve a specific task that belongs to the authenticated user
 * Security: Only returns tasks associated with the user's ID
 * Use Case: For detailed task view or editing
 * 
 * @param {Object} req - Express request object (contains task ID and user info)
 * @param {Object} res - Express response object
 */
const getTask = async (req, res) => {
  try {
    // ==========================================================================
    // AUTHENTICATION VALIDATION
    // ==========================================================================
    
    // Ensure user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('Getting task:', req.params.id, 'for user:', req.user._id);
    
    // ==========================================================================
    // DATABASE QUERY WITH SECURITY CHECK
    // ==========================================================================
    
    // Find task in database (ensure it belongs to user)
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id // CRITICAL: Only get user's own tasks
    });
    
    // ==========================================================================
    // VALIDATION & RESPONSE
    // ==========================================================================
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }
    
    res.json({
      task: task
    });
    
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};

// =============================================================================
// TASK STATISTICS
// =============================================================================

/**
 * Get User's Task Statistics
 * 
 * Purpose: Provide analytics/dashboard data for user's tasks
 * Metrics: Total, completed, pending, and overdue task counts
 * Security: Only calculates stats for user's own tasks
 * 
 * @param {Object} req - Express request object (contains user info)
 * @param {Object} res - Express response object
 */
const getTaskStats = async (req, res) => {
  try {
    // ==========================================================================
    // AUTHENTICATION VALIDATION
    // ==========================================================================
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // ==========================================================================
    // CALCULATE STATISTICS
    // ==========================================================================
    
    // Count total tasks for user
    const totalTasks = await Task.countDocuments({ userId: req.user._id });
    
    // Count completed tasks
    const completedTasks = await Task.countDocuments({ 
      userId: req.user._id, 
      completed: true 
    });
    
    // Count pending (incomplete) tasks
    const pendingTasks = await Task.countDocuments({ 
      userId: req.user._id, 
      completed: false 
    });
    
    // Count overdue tasks (incomplete and past due date)
    const overdueTasks = await Task.countDocuments({ 
      userId: req.user._id, 
      completed: false,
      dueDate: { $lt: new Date() }
    });

    // ==========================================================================
    // RESPONSE
    // ==========================================================================
    
    res.json({
      stats: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        overdue: overdueTasks
      }
    });
    
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({ error: 'Failed to fetch task statistics' });
  }
};

// =============================================================================
// MODULE EXPORTS
// =============================================================================
module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getTask,
  getTaskStats
};