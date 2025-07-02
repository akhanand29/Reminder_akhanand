// routes/chatbot.js - Enhanced version with authentication and task creation
const express = require('express');
const fetch = require('node-fetch'); // For making HTTP requests to Hugging Face API
const Task = require('../models/Task'); // Import Task model
require('dotenv').config(); // Load environment variables from .env file

const router = express.Router();

// Authentication middleware for chatbot routes
const requireAuth = (req, res, next) => {
  if (req._authChecked) {
    return next();
  }
  req._authChecked = true;
  
  console.log('🔐 Chatbot: Checking authentication...');
  console.log('User in session:', req.user ? req.user._id : 'None');
  
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user || !req.user._id) {
    console.log('❌ Chatbot: Authentication failed');
    return res.status(401).json({ error: 'Authentication required to use chatbot' });
  }
  
  console.log('✅ Chatbot: User authenticated:', req.user._id);
  next();
};

/**
 * MAIN FUNCTION: parseTaskFromText()
 * This is the core logic that converts natural language text into structured task data
 * It extracts: task title, description, due date, and reminder timing
 */
function parseTaskFromText(text) {
  const originalText = text.trim();
  let normalizedText = originalText.toLowerCase(); // Convert to lowercase for pattern matching
  
  // STEP 1: EXTRACT REMINDER TIME
  // These regex patterns look for different ways people specify reminder timing
  const reminderPatterns = [
    // "remind me 30 minutes before" or "alert me 1 hour ahead"
    /remind me (?:in |after )?(\d+)\s*(minute|min|hour|hr)s?\s+(?:before|ahead)/i,
    /set (?:a )?reminder (?:for )?(\d+)\s*(minute|min|hour|hr)s?\s+(?:before|ahead)/i,
    /alert me (\d+)\s*(minute|min|hour|hr)s?\s+(?:before|ahead)/i,
    
    // "remind me in 30 minutes" (direct timing - means do the task in 30 minutes)
    /remind me (?:in |after )?(\d+)\s*(minute|min|hour|hr)s?(?!\s+(?:before|ahead))/i,
    /set (?:a )?reminder (?:for |in )?(\d+)\s*(minute|min|hour|hr)s?(?!\s+(?:before|ahead))/i,
    /alert me (?:in |after )?(\d+)\s*(minute|min|hour|hr)s?(?!\s+(?:before|ahead))/i,
    /notification (?:in |after )?(\d+)\s*(minute|min|hour|hr)s?/i
  ];
  
  let reminderTime = 10; // Default: remind 10 minutes before due time
  let isDirectTiming = false; // Flag to track if "in X minutes" means do task in X minutes
  
  // Loop through patterns to find reminder timing
  for (const pattern of reminderPatterns) {
    const match = originalText.match(pattern);
    if (match) {
      let time = parseInt(match[1]); // Extract the number
      const unit = match[2].toLowerCase(); // Extract the unit (minute/hour)
      
      // Convert hours to minutes for consistency
      if (unit.startsWith('hour') || unit.startsWith('hr')) {
        time *= 60;
      }
      
      // Determine if this is advance notice vs direct timing
      if (match[0].includes('before') || match[0].includes('ahead')) {
        // "30 minutes before" = remind 30 minutes early
        reminderTime = time;
      } else {
        // "in 30 minutes" = do the task in 30 minutes (remind at due time)
        isDirectTiming = true;
        reminderTime = 0; // No advance notice needed
      }
      
      // Clean up the text by removing the timing phrase
      normalizedText = originalText.replace(pattern, '').trim();
      break;
    }
  }
  
  // STEP 2: EXTRACT DUE DATE/TIME
  // Comprehensive patterns for parsing when something is due
  const timePatterns = [
    // "at 3:30 PM tomorrow" or "on Monday at 2:00 PM"
    /(?:at|on|by|due)\s+(\d{1,2}):(\d{2})\s*(am|pm)?\s*(?:on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i,
    
    // "tomorrow at 3:30 pm" or "today at 2 pm"
    /(?:tomorrow|today)\s+(?:at\s+)?(\d{1,2}):(\d{2})\s*(am|pm)/i,
    /(?:tomorrow|today)\s+(?:at\s+)?(\d{1,2})\s*(am|pm)/i,
    
    // "on Monday" or "next Tuesday at 3 PM"
    /(?:on\s+|next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*(?:at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?)?/i,
    
    // "in 2 hours" or "after 30 minutes"
    /(?:in|after)\s+(\d+)\s*(minute|min|hour|hr|day)s?/i,
    
    // "at 3:30 PM" or "by 2 PM" (assumes today)
    /(?:at|by)\s+(\d{1,2}):(\d{2})\s*(am|pm)/i,
    /(?:at|by)\s+(\d{1,2})\s*(am|pm)/i,
    
    // Date formats: "on 12/25" or "by 3/15/2024 at 2 PM"
    /(?:on|by|due)\s+(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\s*(?:at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?)?/i,
    
    // "on January 15th at 2 PM"
    /(?:on|by|due)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?)?/i,
    
    // Special keywords
    /(today|tomorrow|tonight|this morning|this afternoon|this evening)/i
  ];
  
  let dueDate = new Date(); // Default to current time
  let foundTimePhrase = '';
  
  /**
   * Helper function: Get the next occurrence of a specific weekday
   */
  function getNextWeekday(dayName) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    const todayIndex = today.getDay();
    const targetIndex = days.indexOf(dayName.toLowerCase());
    
    if (targetIndex === -1) return new Date();
    
    let daysUntilTarget = targetIndex - todayIndex;
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
    }
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);
    return targetDate;
  }
  
  /**
   * Helper function: Convert 12-hour time format to 24-hour
   */
  function convertTo24Hour(hour, minute, period) {
    let hour24 = parseInt(hour);
    const min = minute ? parseInt(minute) : 0;
    
    if (period) {
      const p = period.toLowerCase();
      if (p === 'pm' && hour24 !== 12) {
        hour24 += 12;
      } else if (p === 'am' && hour24 === 12) {
        hour24 = 0;
      }
    }
    
    return { hour: hour24, minute: min };
  }
  
  // Try to match each time pattern against the original text
  for (const pattern of timePatterns) {
    const match = originalText.match(pattern);
    if (match) {
      foundTimePhrase = match[0];
      
      try {
        // Handle relative times: "in 2 hours", "after 30 minutes"
        if (match[0].match(/(?:in|after)\s+\d+/i)) {
          const amount = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          
          dueDate = new Date();
          
          if (unit.startsWith('minute') || unit.startsWith('min')) {
            dueDate.setMinutes(dueDate.getMinutes() + amount);
          } else if (unit.startsWith('hour') || unit.startsWith('hr')) {
            dueDate.setHours(dueDate.getHours() + amount);
          } else if (unit.startsWith('day')) {
            dueDate.setDate(dueDate.getDate() + amount);
          }
          
          if (isDirectTiming) {
            reminderTime = 0;
          }
        }
        
        // Handle "tomorrow" with optional specific time
        else if (match[0].toLowerCase().includes('tomorrow')) {
          dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 1);
          
          const timeMatch = match[0].match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
          if (timeMatch) {
            const time = convertTo24Hour(timeMatch[1], timeMatch[2], timeMatch[3]);
            dueDate.setHours(time.hour, time.minute, 0, 0);
          } else {
            dueDate.setHours(9, 0, 0, 0);
          }
        }
        
        // Handle "today" with optional specific time
        else if (match[0].toLowerCase().includes('today')) {
          dueDate = new Date();
          
          const timeMatch = match[0].match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
          if (timeMatch) {
            const time = convertTo24Hour(timeMatch[1], timeMatch[2], timeMatch[3]);
            dueDate.setHours(time.hour, time.minute, 0, 0);
          }
        }
        
        // Handle "tonight"
        else if (match[0].toLowerCase().includes('tonight')) {
          dueDate = new Date();
          dueDate.setHours(20, 0, 0, 0);
        }
        
        // Handle time-of-day phrases
        else if (match[0].toLowerCase().includes('this morning')) {
          dueDate = new Date();
          dueDate.setHours(9, 0, 0, 0);
        }
        else if (match[0].toLowerCase().includes('this afternoon')) {
          dueDate = new Date();
          dueDate.setHours(14, 0, 0, 0);
        }
        else if (match[0].toLowerCase().includes('this evening')) {
          dueDate = new Date();
          dueDate.setHours(18, 0, 0, 0);
        }
        
        // Handle specific days of the week
        else if (match[1] && ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(match[1].toLowerCase())) {
          dueDate = getNextWeekday(match[1]);
          
          if (match[2]) {
            const time = convertTo24Hour(match[2], match[3], match[4]);
            dueDate.setHours(time.hour, time.minute, 0, 0);
          } else {
            dueDate.setHours(9, 0, 0, 0);
          }
        }
        
        // Handle specific times without dates: "at 3 PM", "by 2:30 PM"
        else if (match[1] && (match[2] || match[3])) {
          dueDate = new Date();
          
          let hour = match[1];
          let minute = match[2] || '0';
          let period = match[3] || match[2];
          
          if (match[2] && (match[2].toLowerCase() === 'am' || match[2].toLowerCase() === 'pm')) {
            minute = '0';
            period = match[2];
          }
          
          const time = convertTo24Hour(hour, minute, period);
          dueDate.setHours(time.hour, time.minute, 0, 0);
          
          // If the time has passed today, schedule for tomorrow
          const now = new Date();
          if (dueDate.getTime() <= now.getTime()) {
            dueDate.setDate(dueDate.getDate() + 1);
          }
        }
        
      } catch (e) {
        console.warn('Date parsing error:', e);
        dueDate = new Date();
      }
      
      normalizedText = originalText.replace(pattern, '').trim();
      break;
    }
  }
  
  // STEP 3: EXTRACT TASK TITLE AND DESCRIPTION
  let taskTitle = '';
  let taskDescription = '';
  
  const cleanupPatterns = [
    /^(?:remind me to|remind me|set a reminder to|set reminder to|alert me to|notify me to|i need to|i should|please remind me to|can you remind me to)\s*/i,
    /^(?:task|todo|to do):\s*/i
  ];
  
  let cleanedText = normalizedText;
  for (const pattern of cleanupPatterns) {
    cleanedText = cleanedText.replace(pattern, '').trim();
  }
  
  if (cleanedText) {
    const separators = [' - ', ' | ', ': ', ' about ', ' regarding '];
    let splitFound = false;
    
    for (const sep of separators) {
      if (cleanedText.includes(sep)) {
        const parts = cleanedText.split(sep, 2);
        taskTitle = parts[0].trim();
        taskDescription = parts[1].trim();
        splitFound = true;
        break;
      }
    }
    
    if (!splitFound) {
      if (cleanedText.length > 50) {
        const words = cleanedText.split(' ');
        if (words.length > 8) {
          taskTitle = words.slice(0, 5).join(' ');
          taskDescription = words.slice(5).join(' ');
        } else {
          taskTitle = cleanedText;
        }
      } else {
        taskTitle = cleanedText;
      }
    }
  } else {
    taskTitle = originalText;
  }
  
  // Capitalize first letters
  if (taskTitle) {
    taskTitle = taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1);
  }
  
  if (taskDescription) {
    taskDescription = taskDescription.charAt(0).toUpperCase() + taskDescription.slice(1);
  }
  
  return {
    title: taskTitle || originalText,
    description: taskDescription,
    dueDate: dueDate.toISOString(),
    reminderTime: reminderTime,
  };
}

/**
 * ENHANCED ROUTE HANDLER - Now creates task directly
 * POST endpoint that accepts a message, parses it, and creates a task
 */
router.post('/', requireAuth, async (req, res) => {
  const { message, createTask: shouldCreateTask = true } = req.body;
  
  // Validate input
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    console.log('🤖 Processing chatbot message:', message);
    console.log('🤖 User ID:', req.user._id);
    
    // Parse the message to extract task information
    const parsedTask = parseTaskFromText(message);
    console.log('🤖 Parsed task data:', parsedTask);
    
    // If shouldCreateTask is true, create the task in database
    if (shouldCreateTask) {
      try {
        const newTask = new Task({
          title: parsedTask.title,
          description: parsedTask.description,
          dueDate: new Date(parsedTask.dueDate),
          reminderTime: parseInt(parsedTask.reminderTime),
          reminderMinutesBefore: parseInt(parsedTask.reminderTime),
          userId: req.user._id,
          isCompleted: false,
          completed: false
        });
        
        const savedTask = await newTask.save();
        console.log('✅ Task created successfully via chatbot:', savedTask._id);
        
        // Return both parsed data and created task
        res.json({
          success: true,
          message: 'Task created successfully!',
          parsedData: parsedTask,
          task: {
            id: savedTask._id,
            title: savedTask.title,
            description: savedTask.description,
            dueDate: savedTask.dueDate,
            reminderTime: savedTask.reminderTime,
            isCompleted: savedTask.isCompleted
          }
        });
        
      } catch (taskError) {
        console.error('❌ Error creating task:', taskError);
        
        // Still return parsed data even if task creation fails
        res.json({
          success: false,
          message: 'Task parsing successful, but failed to save task',
          parsedData: parsedTask,
          error: taskError.message
        });
      }
    } else {
      // Just return parsed data without creating task
      res.json({
        success: true,
        message: 'Task parsed successfully',
        parsedData: parsedTask
      });
    }

  } catch (err) {
    console.error('❌ Chatbot processing error:', err);
    res.status(500).json({ 
      error: 'Failed to process message',
      details: err.message
    });
  }
});

/**
 * GET endpoint to test chatbot functionality
 */
router.get('/test', requireAuth, (req, res) => {
  res.json({
    message: 'Chatbot is working!',
    user: req.user.email,
    examples: [
      "Remind me to call mom at 3 PM",
      "Set a reminder to take out trash tomorrow at 7 AM",
      "Buy groceries this evening",
      "Meeting with team on Monday at 2:30 PM, remind me 30 minutes before"
    ]
  });
});

module.exports = router;