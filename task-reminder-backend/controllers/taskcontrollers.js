const Task = require('../models/Task');
const mongoose = require('mongoose');

// Get all tasks for the authenticated user (DATABASE ONLY)
const getTasks = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('Getting tasks for user:', req.user._id);
    
    // Get tasks from database ONLY
    const tasks = await Task.find({ userId: req.user._id }).sort({ createdAt: -1 });
    console.log('Tasks found in database:', tasks.length);
    
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

// Create a new task (DATABASE ONLY)
const createTask = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('Creating task for user:', req.user._id);
    
    // Create task object with user ID
    const taskData = {
      ...req.body,
      userId: req.user._id // CRITICAL: Associate with user
    };
    
    console.log("TaskData = ",taskData);
    // Save directly to database
    const task = new Task(taskData);
    const savedTask = await task.save();
    
    console.log('✅ Task saved to database:', savedTask._id);
    
    res.status(201).json({
      task: savedTask,
      message: 'Task created successfully'
    });
    
  } catch (error) {
    console.error('Create task error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Update a task (DATABASE ONLY)
const updateTask = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('Updating task:', req.params.id, 'for user:', req.user._id);
    
    // Find and update task in database (ensure it belongs to user)
    const task = await Task.findOneAndUpdate(
      { 
        _id: req.params.id, 
        userId: req.user._id // CRITICAL: Only update user's own tasks
      },
      req.body,
      { new: true } // Return updated document
    );
    
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

// Delete a task (DATABASE ONLY)
const deleteTask = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('Deleting task:', req.params.id, 'for user:', req.user._id);
    
    // Find and delete task from database (ensure it belongs to user)
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id // CRITICAL: Only delete user's own tasks
    });
    
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

// Get a single task (DATABASE ONLY)
const getTask = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('Getting task:', req.params.id, 'for user:', req.user._id);
    
    // Find task in database (ensure it belongs to user)
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id // CRITICAL: Only get user's own tasks
    });
    
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

// Get user's task statistics
const getTaskStats = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const totalTasks = await Task.countDocuments({ userId: req.user._id });
    const completedTasks = await Task.countDocuments({ 
      userId: req.user._id, 
      completed: true 
    });
    const pendingTasks = await Task.countDocuments({ 
      userId: req.user._id, 
      completed: false 
    });
    const overdueTasks = await Task.countDocuments({ 
      userId: req.user._id, 
      completed: false,
      dueDate: { $lt: new Date() }
    });

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

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getTask,
  getTaskStats
};