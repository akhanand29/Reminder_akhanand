/**
 * Task Routes Module - FIXED VERSION
 * 
 * This module handles all task-related API endpoints with proper authentication.
 * All routes require user authentication and ensure data isolation between users.
 */

const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Controller = require('../controllers/taskcontrollers');

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Authentication Middleware with Loop Prevention
 */
const requireAuth = (req, res, next) => {
  // Prevent multiple auth checks per request
  if (req._authChecked) {
    return next();
  }
  req._authChecked = true;
  
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
 * Loads all tasks belonging to the authenticated user.
 * Uses controller for consistent logic.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    // Use controller for consistent task loading logic
    Controller.getTasks(req, res);
  } catch (error) {
    console.error('❌ Error loading tasks:', error);
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

/**
 * POST /api/tasks
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    Controller.createTask(req, res);
  } catch (error) {
    console.error('❌ Error creating task:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/tasks/:id
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    Controller.updateTask(req, res);
  } catch (error) {
    console.error('❌ Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/tasks/:id
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    Controller.deleteTask(req, res);
  } catch (error) {
    console.error('❌ Error deleting task:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tasks/stats
 * 
 * Gets task statistics for the authenticated user.
 * Separate endpoint for analytics data.
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('📊 Getting task stats for user:', userId);
    
    // Get task counts directly
    const totalTasks = await Task.countDocuments({ userId });
    const completedTasks = await Task.countDocuments({ userId, isCompleted: true });
    const pendingTasks = totalTasks - completedTasks;
    
    const stats = {
      total: totalTasks,
      completed: completedTasks,
      pending: pendingTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0
    };
    
    console.log('✅ Task stats:', stats);
    res.json(stats);
    
  } catch (error) {
    console.error('❌ Error getting task stats:', error);
    res.status(500).json({ error: 'Failed to fetch task statistics' });
  }
});

module.exports = router;