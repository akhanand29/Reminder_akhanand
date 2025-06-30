/**
 * Task Routes Module
 * 
 * This module handles all task-related API endpoints with proper authentication.
 * All routes require user authentication and ensure data isolation between users.
 * 
 * Routes:
 * - GET    /api/tasks       - Load user's tasks
 * - POST   /api/tasks       - Create new task
 * - PUT    /api/tasks/:id   - Update existing task
 * - DELETE /api/tasks/:id   - Delete task
 * - GET    /api/tasks/stats - Get task statistics
 */

// ============================================================================
// DEPENDENCIES
// ============================================================================
const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Controller = require('../controllers/taskcontrollers');

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Authentication Middleware
 * 
 * Ensures that only authenticated users can access task routes.
 * Performs comprehensive checks on user session and authentication state.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next middleware function
 * @returns {Object} 401 error if not authenticated, otherwise continues
 */
const requireAuth = (req, res, next) => {
  console.log('🔐 Checking authentication...');
  console.log('User in session:', req.user ? req.user._id : 'None');
  
  // Check multiple authentication conditions
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user || !req.user._id) {
    console.log('❌ Authentication failed');
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  console.log('✅ User authenticated:', req.user._id);
  next();
};

// ============================================================================
// TASK ROUTES
// ============================================================================

/**
 * GET /api/tasks
 * 
 * Loads all tasks belonging to the authenticated user only.
 * Tasks are sorted by creation date (newest first) for better UX.
 * 
 * Security: Only returns tasks where userId matches the authenticated user
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('🔍 Loading tasks for user:', userId);
    
    // CRITICAL SECURITY: Only fetch tasks that belong to this specific user
    const tasks = await Task.find({ userId: userId }).sort({ createdAt: -1 });
    
    // Debug logging for task retrieval
    console.log(`✅ Found ${tasks.length} tasks for user ${userId}`);
    console.log('Task IDs:', tasks.map(t => t._id));
    
    // Return tasks with metadata
    res.json({
      tasks: tasks,
      count: tasks.length,
      userId: userId
    });
  } catch (error) {
    console.error('❌ Error loading tasks:', error);
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

/**
 * POST /api/tasks
 * 
 * Creates a new task for the authenticated user.
 * Delegates actual creation logic to the task controller.
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    // Delegate to controller for task creation logic
    Controller.createTask(req, res);
  } catch (error) {
    console.error('❌ Error creating task:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/tasks/:id
 * 
 * Updates an existing task belonging to the authenticated user.
 * Controller handles ownership verification and update logic.
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    // Delegate to controller for task update logic
    Controller.updateTask(req, res);
  } catch (error) {
    console.error('❌ Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/tasks/:id
 * 
 * Deletes a task belonging to the authenticated user.
 * Controller handles ownership verification and deletion logic.
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Delegate to controller for task deletion logic
    Controller.deleteTask(req, res);
  } catch (error) {
    console.error('❌ Error deleting task:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tasks/stats
 * 
 * Retrieves task statistics for the authenticated user.
 * Provides analytics and summary data about user's tasks.
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    // Delegate to controller for statistics logic
    Controller.getTasks(req, res);
  } catch (error) {
    console.error('❌ Error getting task stats:', error);
    res.status(500).json({ error: 'Failed to fetch task statistics' });
  }
});

// ============================================================================
// EXPORT
// ============================================================================
module.exports = router;