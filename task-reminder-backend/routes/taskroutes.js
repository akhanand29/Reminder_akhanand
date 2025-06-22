// Import Express framework and create a router instance
const express = require('express');
const router = express.Router();

// Import the task controller module that contains the business logic
const controller = require('../controllers/taskcontrollers');

// Define route handlers for different HTTP methods and endpoints

// GET route - Retrieve all tasks
// When a GET request is made to the base path '/', call the getTasks function
router.get('/', controller.getTasks);

// POST route - Create a new task
// When a POST request is made to the base path '/', call the createTask function
router.post('/', controller.createTask);

// DELETE route - Remove a specific task by ID
// When a DELETE request is made to '/:id', call the deleteTask function
// The ':id' is a route parameter that captures the task ID from the URL
router.delete('/:id', controller.deleteTask);

// PUT route - Update/toggle task completion status
// When a PUT request is made to '/:id', call the toggleTaskCompletion function
// The ':id' parameter allows targeting a specific task for status updates
router.put('/:id', controller.toggleTaskCompletion);

// Export the router so it can be used in the main application
module.exports = router;



