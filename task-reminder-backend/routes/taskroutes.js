// routes/taskroutes.js - FIXED VERSION
const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Controller = require('../controllers/taskcontrollers')

// Middleware to ensure user is authenticated
const requireAuth = (req, res, next) => {
  console.log('🔐 Checking authentication...');
  console.log('User in session:', req.user ? req.user._id : 'None');
  
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user || !req.user._id) {
    console.log('❌ Authentication failed');
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  console.log('✅ User authenticated:', req.user._id);
  next();
};

// GET /api/tasks - Load tasks for authenticated user ONLY
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('🔍 Loading tasks for user:', userId);
    
    // CRITICAL: Only get tasks that belong to this specific user
    const tasks = await Task.find({ userId: userId }).sort({ createdAt: -1 });
    
    console.log(`✅ Found ${tasks.length} tasks for user ${userId}`);
    console.log('Task IDs:', tasks.map(t => t._id));
    
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

// POST /api/tasks - Create task for authenticated user ONLY
router.post('/', requireAuth, async (req, res) => {
  try {

    Controller.createTask(req, res)
  
  } catch (error) {
    console.error('❌ Error creating task:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tasks/:id - Update task (user's own tasks only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    Controller.updateTask(req, res);
  } catch (error) {
    console.error('❌ Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tasks/:id - Delete task (user's own tasks only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    Controller.deleteTask(req, res);
  } catch (error) {
    console.error('❌ Error deleting task:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/stats - Get user's task statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    Controller.getTasks(req, res);
  } catch (error) {
    console.error('❌ Error getting task stats:', error);
    res.status(500).json({ error: 'Failed to fetch task statistics' });
  }
});

module.exports = router;