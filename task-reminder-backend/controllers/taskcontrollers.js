// Import the Task model from the models directory
// This provides access to the Task schema and database operations
const Task = require('../models/Task');

/**
 * GET /tasks - Retrieve all tasks from the database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTasks = async (req, res) => {
  try {
    // Fetch all tasks from the database (no filter criteria)
    const tasks = await Task.find();
    
    // Send tasks as JSON response with 200 status (default)
    res.json(tasks);
    
  } catch (err) {
    // Handle any database or server errors
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * POST /tasks - Create a new task
 * @param {Object} req - Express request object (contains task data in req.body)
 * @param {Object} res - Express response object
 */
exports.createTask = async (req, res) => {
  try {
    // Log incoming task data for debugging purposes
    console.log('Received task:', req.body);
    
    // Create new Task instance using data from request body
    const newTask = new Task(req.body);
    
    // Save the new task to the database
    await newTask.save();
    
    // Return the created task with 201 (Created) status
    res.status(201).json(newTask);
    
  } catch (err) {
    // Log error details for debugging
    console.error('Create task error:', err);
    
    // Return 400 (Bad Request) for validation errors or malformed data
    res.status(400).json({ error: 'Bad request' });
  }
};

/**
 * DELETE /tasks/:id - Delete a specific task by ID
 * @param {Object} req - Express request object (contains task ID in req.params.id)
 * @param {Object} res - Express response object
 */
exports.deleteTask = async (req, res) => {
  try {
    // Find task by ID and delete it in one operation
    // Note: This doesn't check if the task exists before deletion
    await Task.findByIdAndDelete(req.params.id);
    
    // Send 204 (No Content) status indicating successful deletion with no response body
    res.status(204).send();
    
  } catch (err) {
    // Handle errors (invalid ID format, database issues, etc.)
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

/**
 * PATCH/PUT /tasks/:id/toggle - Toggle the completion status of a specific task
 * @param {Object} req - Express request object (contains task ID in req.params.id)
 * @param {Object} res - Express response object
 */
exports.toggleTaskCompletion = async (req, res) => {
  console.log('Toggle request received for ID:', req.params.id);
  
  try {
    const task = await Task.findById(req.params.id);
    console.log('Task found - ID:', task?._id, 'Current isCompleted:', task?.isCompleted);
    
    if (!task) {
      return res.status(404).json({ 
        error: 'Task not found on server. ID: ' + req.params.id + ' may be invalid or task may have been deleted.' 
      });
    }
    
    task.isCompleted = !task.isCompleted;
    
    console.log('Toggling isCompleted to:', task.isCompleted);
    
    const savedTask = await task.save();
    console.log('✅ SAVE SUCCESSFUL - New isCompleted status:', savedTask.isCompleted);
    
    res.json(savedTask);
    
  } catch (err) {
    console.error('Toggle task error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
};