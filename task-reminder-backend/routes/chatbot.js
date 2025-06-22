// routes/chatbot.js - Task extraction chatbot endpoint
const express = require('express');
const fetch = require('node-fetch'); // For making HTTP requests to Hugging Face API
require('dotenv').config(); // Load environment variables from .env file

const router = express.Router();

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
  
  let reminderTime = '10'; // Default: remind 10 minutes before due time
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
        reminderTime = time.toString();
      } else {
        // "in 30 minutes" = do the task in 30 minutes (remind at due time)
        isDirectTiming = true;
        reminderTime = '0'; // No advance notice needed
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
   * Example: If today is Tuesday and we want "Friday", it returns this Friday
   */
  function getNextWeekday(dayName) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    const todayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const targetIndex = days.indexOf(dayName.toLowerCase());
    
    if (targetIndex === -1) return new Date(); // Invalid day name
    
    let daysUntilTarget = targetIndex - todayIndex;
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7; // If day already passed this week, get next week
    }
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);
    return targetDate;
  }
  
  /**
   * Helper function: Convert 12-hour time format to 24-hour
   * Example: convertTo24Hour("2", "30", "pm") returns {hour: 14, minute: 30}
   */
  function convertTo24Hour(hour, minute, period) {
    let hour24 = parseInt(hour);
    const min = minute ? parseInt(minute) : 0;
    
    if (period) {
      const p = period.toLowerCase();
      if (p === 'pm' && hour24 !== 12) {
        hour24 += 12; // Convert PM hours (except 12 PM)
      } else if (p === 'am' && hour24 === 12) {
        hour24 = 0; // Convert 12 AM to 0 hours (midnight)
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
          
          dueDate = new Date(); // Start from current time
          
          // Add the specified amount of time
          if (unit.startsWith('minute') || unit.startsWith('min')) {
            dueDate.setMinutes(dueDate.getMinutes() + amount);
          } else if (unit.startsWith('hour') || unit.startsWith('hr')) {
            dueDate.setHours(dueDate.getHours() + amount);
          } else if (unit.startsWith('day')) {
            dueDate.setDate(dueDate.getDate() + amount);
          }
          
          // If this was direct timing ("remind me in 30 minutes"), 
          // set reminder to trigger exactly when the task is due
          if (isDirectTiming) {
            reminderTime = '0';
          }
        }
        
        // Handle "tomorrow" with optional specific time
        else if (match[0].toLowerCase().includes('tomorrow')) {
          dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 1); // Add one day
          
          // Look for specific time mentioned with "tomorrow"
          const timeMatch = match[0].match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
          if (timeMatch) {
            const time = convertTo24Hour(timeMatch[1], timeMatch[2], timeMatch[3]);
            dueDate.setHours(time.hour, time.minute, 0, 0);
          } else {
            dueDate.setHours(9, 0, 0, 0); // Default to 9 AM tomorrow
          }
        }
        
        // Handle "today" with optional specific time
        else if (match[0].toLowerCase().includes('today')) {
          dueDate = new Date(); // Keep today's date
          
          const timeMatch = match[0].match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
          if (timeMatch) {
            const time = convertTo24Hour(timeMatch[1], timeMatch[2], timeMatch[3]);
            dueDate.setHours(time.hour, time.minute, 0, 0);
          }
          // If no specific time, keep current time
        }
        
        // Handle "tonight" - default to 8 PM today
        else if (match[0].toLowerCase().includes('tonight')) {
          dueDate = new Date();
          dueDate.setHours(20, 0, 0, 0); // 8 PM
        }
        
        // Handle time-of-day phrases
        else if (match[0].toLowerCase().includes('this morning')) {
          dueDate = new Date();
          dueDate.setHours(9, 0, 0, 0); // 9 AM
        }
        else if (match[0].toLowerCase().includes('this afternoon')) {
          dueDate = new Date();
          dueDate.setHours(14, 0, 0, 0); // 2 PM
        }
        else if (match[0].toLowerCase().includes('this evening')) {
          dueDate = new Date();
          dueDate.setHours(18, 0, 0, 0); // 6 PM
        }
        
        // Handle specific days of the week: "Monday", "next Friday"
        else if (match[1] && ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(match[1].toLowerCase())) {
          dueDate = getNextWeekday(match[1]);
          
          // Check if a specific time was mentioned with the day
          if (match[2]) { // Time specified
            const time = convertTo24Hour(match[2], match[3], match[4]);
            dueDate.setHours(time.hour, time.minute, 0, 0);
          } else {
            dueDate.setHours(9, 0, 0, 0); // Default to 9 AM
          }
        }
        
        // Handle specific times without dates: "at 3 PM", "by 2:30 PM"
        else if (match[1] && (match[2] || match[3])) {
          dueDate = new Date(); // Today
          const time = convertTo24Hour(match[1], match[2], match[3]);
          dueDate.setHours(time.hour, time.minute, 0, 0);
          
          // If the specified time has already passed today, schedule for tomorrow
          if (dueDate < new Date()) {
            dueDate.setDate(dueDate.getDate() + 1);
          }
        }
        
        // Handle date formats: "12/25", "3/15/2024", "12/25 at 2 PM"
        else if (match[1] && match[2] && match[1].match(/\d+/) && match[2].match(/\d+/)) {
          const month = parseInt(match[1]) - 1; // JavaScript months are 0-indexed
          const day = parseInt(match[2]);
          const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
          
          dueDate = new Date(year, month, day);
          
          // Check for time specified with the date
          if (match[4]) {
            const time = convertTo24Hour(match[4], match[5], match[6]);
            dueDate.setHours(time.hour, time.minute, 0, 0);
          } else {
            dueDate.setHours(9, 0, 0, 0); // Default to 9 AM
          }
        }
        
      } catch (e) {
        console.warn('Date parsing error:', e);
        dueDate = new Date(); // Fallback to current time
      }
      
      // Clean up the text by removing the time phrase
      normalizedText = originalText.replace(pattern, '').trim();
      break;
    }
  }
  
  // STEP 3: EXTRACT TASK TITLE AND DESCRIPTION
  let taskTitle = '';
  let taskDescription = '';
  
  // Remove common command words to isolate the actual task
  const cleanupPatterns = [
    /^(?:remind me to|remind me|set a reminder to|set reminder to|alert me to|notify me to|i need to|i should|please remind me to|can you remind me to)\s*/i,
    /^(?:task|todo|to do):\s*/i
  ];
  
  let cleanedText = normalizedText;
  for (const pattern of cleanupPatterns) {
    cleanedText = cleanedText.replace(pattern, '').trim();
  }
  
  // If we have remaining text after cleanup, extract task info
  if (cleanedText) {
    // Try to split on common separators to get title and description
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
    
    // If no separator found, try intelligent splitting for long text
    if (!splitFound) {
      if (cleanedText.length > 50) {
        const words = cleanedText.split(' ');
        if (words.length > 8) {
          // First 5 words = title, rest = description
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
    // Fallback: use original text if nothing was extracted
    taskTitle = originalText;
  }
  
  // Capitalize first letters
  if (taskTitle) {
    taskTitle = taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1);
  }
  
  if (taskDescription) {
    taskDescription = taskDescription.charAt(0).toUpperCase() + taskDescription.slice(1);
  }
  
  // Return structured task object
  return {
    title: taskTitle || originalText,
    description: taskDescription,
    dueDate: dueDate.toISOString(), // Convert to ISO string for consistency
    reminderTime: reminderTime,
  };
}

/**
 * Helper function to create a structured prompt for the Hugging Face AI model
 * This formats the user's message into a prompt that guides the AI to extract task info
 */
function createTaskPrompt(message) {
  return `You are a task extraction assistant. Parse this message and extract the task information.

Message: "${message}"

Extract:
1. The main task/action (what needs to be done)
2. Any description or additional details
3. When it's due (if mentioned)
4. Reminder time in minutes (if mentioned, default to 10)

Respond in this exact format:
task: [main task description]
description: [additional details if any]
due: [due date/time if mentioned]
reminder: [reminder time in minutes]

Message: ${message}`;
}

/**
 * MAIN ROUTE HANDLER
 * POST endpoint that accepts a message and returns structured task data
 * Uses Hugging Face AI as primary method, falls back to local parsing
 */
router.post('/', async (req, res) => {
  const { message } = req.body;
  
  // Validate input
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Check if Hugging Face API key is available
    if (!process.env.HUGGINGFACE_API_KEY) {
      console.warn('No HF API key found, using fallback parsing');
      const task = parseTaskFromText(message);
      return res.json(task);
    }

    // Make request to Hugging Face AI model
    const hfRes = await fetch(
      'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`
        },
        body: JSON.stringify({
          inputs: createTaskPrompt(message),
          parameters: {
            max_new_tokens: 100,    // Limit response length
            temperature: 0.7,       // Control randomness (0 = deterministic, 1 = very random)
            return_full_text: false // Only return generated text, not input
          },
          options: { 
            wait_for_model: true,   // Wait if model is loading
            use_cache: false        // Get fresh response each time
          }
        })
      }
    );

    // Handle different error scenarios from Hugging Face API
    if (hfRes.status === 401) {
      console.error('HF API Authentication failed - check your API key');
      const task = parseTaskFromText(message);
      return res.json(task);
    }
    
    if (hfRes.status === 503) {
      console.warn('Model is loading, using fallback');
      const task = parseTaskFromText(message);
      return res.json(task);
    }

    if (!hfRes.ok) {
      console.error('HF API Error:', hfRes.status, hfRes.statusText);
      const errorText = await hfRes.text();
      console.error('Error details:', errorText);
      
      // Fallback to local parsing
      const task = parseTaskFromText(message);
      return res.json(task);
    }

    // Validate that we received JSON response
    const contentType = hfRes.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Non-JSON response, using fallback');
      const task = parseTaskFromText(message);
      return res.json(task);
    }

    const hfJson = await hfRes.json();
    
    // Extract generated text from different possible response formats
    let generated = '';
    if (Array.isArray(hfJson) && hfJson.length > 0) {
      generated = hfJson[0].generated_text || hfJson[0].text || '';
    } else if (hfJson.generated_text) {
      generated = hfJson.generated_text;
    } else if (typeof hfJson === 'string') {
      generated = hfJson;
    }

    // If we got a valid response from the AI, parse it
    if (generated && generated.trim() !== '') {
      // Use regex to extract structured information from AI response
      const taskRegex = /task:\s*([^\n]+)/i;
      const descRegex = /description:\s*([^\n]+)/i;
      const dueRegex = /due:\s*([^\n]+)/i;
      const reminderRegex = /reminder:\s*(\d+)/i;
      
      const taskMatch = generated.match(taskRegex);
      const descMatch = generated.match(descRegex);
      const dueMatch = generated.match(dueRegex);
      const reminderMatch = generated.match(reminderRegex);
      
      // Build task object, using fallback parsing for missing pieces
      const task = {
        title: taskMatch ? taskMatch[1].trim() : parseTaskFromText(message).title,
        description: descMatch ? descMatch[1].trim() : parseTaskFromText(message).description,
        dueDate: (() => {
          if (dueMatch && dueMatch[1].trim() !== '') {
            const parsedDate = new Date(dueMatch[1]);
            return !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : parseTaskFromText(message).dueDate;
          }
          return parseTaskFromText(message).dueDate;
        })(),
        reminderTime: reminderMatch ? reminderMatch[1] : parseTaskFromText(message).reminderTime,
      };
      
      return res.json(task);
    } else {
      // AI didn't generate useful output, use local parsing
      const task = parseTaskFromText(message);
      return res.json(task);
    }

  } catch (err) {
    console.error('Chatbot error:', err);
    
    // Final fallback: try local parsing
    try {
      const task = parseTaskFromText(message);
      return res.json(task);
    } catch (fallbackErr) {
      console.error('Fallback parsing failed:', fallbackErr);
      // Last resort: return basic task structure
      return res.status(500).json({ 
        error: 'Chatbot failed',
        fallback: {
          title: message,
          description: '',
          dueDate: new Date().toISOString(),
          reminderTime: '10'
        }
      });
    }
  }
});

module.exports = router;