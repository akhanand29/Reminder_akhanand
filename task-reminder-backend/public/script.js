document.addEventListener('DOMContentLoaded', () => {
  const taskForm = document.getElementById('task-form');
  const taskList = document.getElementById('task-list');
  const addFormContainer = document.getElementById('add-form-container');
  const toggleAddBtn = document.getElementById('toggle-add-btn');
  const closeFormBtn = document.querySelector('.close-form-btn');
  const modalBackdrop = document.getElementById('modal-backdrop');

  const emptyState = document.getElementById('empty-state');
  const searchInput = document.getElementById('search-tasks');
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  // Stats elements
  const totalTasksEl = document.getElementById('total-tasks');
  const pendingTasksEl = document.getElementById('pending-tasks');
  const completedTasksEl = document.getElementById('completed-tasks');
  const overdueTasksEl = document.getElementById('overdue-tasks');
  
  // Auth state
  let isAuthenticated = false;
  let currentUser = null;
  
  const API_BASE_URL = '/api/tasks';
  let allTasks = [];
  let currentFilter = 'all';
  let searchQuery = '';
  let isEditMode = false;
  let editingTaskId = null;
  let expandedTasks = new Set();

  // Initialize form state
  if (addFormContainer) {
    addFormContainer.style.bottom = '-100%';
  }
  if (taskList) {
    taskList.style.display = 'block';
  }

  // Plus button functionality
  if (toggleAddBtn) {
    toggleAddBtn.addEventListener('click', () => {
      if (addFormContainer) {
        const isVisible = addFormContainer.style.bottom === '0px' || addFormContainer.style.display === 'block';
        
        if (isVisible) {
          // Hide form
          addFormContainer.style.bottom = '-100%';
          addFormContainer.style.display = 'none';
          if (modalBackdrop) modalBackdrop.style.display = 'none';
        } else {
            resetForm();
          // Show form
          addFormContainer.style.display = 'block';
          addFormContainer.style.bottom = '0px';
        //   if (modalBackdrop) modalBackdrop.style.display = 'block';
        }
      }
    });
  }

  // Close form button
  if (closeFormBtn) {
    closeFormBtn.addEventListener('click', () => {
      if (addFormContainer) {
        addFormContainer.style.bottom = '-100%';
        addFormContainer.style.display = 'none';
      }
      if (modalBackdrop) {
        modalBackdrop.style.display = 'none';
      }
      resetForm();
    });
  }

  // Modal backdrop click to close form
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', () => {
      if (addFormContainer) {
        addFormContainer.style.bottom = '-100%';
        addFormContainer.style.display = 'none';
      }
      modalBackdrop.style.display = 'none';
      resetForm();
    });
  }



 // Fixed Chatbot functionality
const chatbotButton = document.getElementById('chatbot-button');
const chatWindow = document.getElementById('chat-window');
const chatInput = document.getElementById('chat-input');
const chatSubmit = document.getElementById('chat-submit');
const chatMessages = document.getElementById('chat-messages');

if (chatbotButton && chatWindow) {
  chatbotButton.addEventListener('click', () => {
    const isVisible = chatWindow.style.display === 'block';
    chatWindow.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible && chatInput) {
      setTimeout(() => chatInput.focus(), 100);
    }
  });
}

if (chatSubmit && chatInput) {
  chatSubmit.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (message) {
      handleChatMessage(message);
      chatInput.value = '';
    }
  });
  
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const message = chatInput.value.trim();
      if (message) {
        handleChatMessage(message);
        chatInput.value = '';
      }
    }
  });
}

// FIXED: Main chat message handler
async function handleChatMessage(message) {
  console.log('Chat message received:', message);
  
  try {
    // Add user message to chat
    addMessageToChat('user', message);
    
    // Show processing message
    const processingId = addMessageToChat('bot', '🤔 Processing your request...');
    
    // FIXED: Send message to chatbot backend endpoint
    const response = await fetch('/api/chatbot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        message: message,
        createTask: true // Ensure task creation is enabled
      })
    });
    
    // Remove processing message
    removeMessage(processingId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response error:', errorText);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Server response:', result);
    
    // FIXED: Handle different response formats
    if (result.error) {
      addMessageToChat('bot', `❌ Error: ${result.error}`);
      return;
    }
    
    // Check if task was successfully created on backend
    if (result.success && result.task) {
      // Task was created on backend, show success message
      const task = result.task;
      const dueDate = new Date(task.dueDate);
      const formattedDate = dueDate.toLocaleString();
      const reminderText = task.reminderTime === 0 ? 'right when due' : `${task.reminderTime} minutes before`;
      
      let successMessage = `✅ Task created successfully!\n\n`;
      successMessage += `📋 **${task.title}**\n`;
      successMessage += `📅 Due: ${formattedDate}\n`;
      successMessage += `⏰ Reminder: ${reminderText}`;
      
      if (task.description) {
        successMessage += `\n📝 Notes: ${task.description}`;
      }
      
      addMessageToChat('bot', successMessage);
      
      // FIXED: Refresh task list using multiple possible function names
      refreshTaskList();
      
    } else if (result.parsedData) {
      // Backend parsed but didn't create task, try frontend creation
      const success = await createTaskFromChatbot(result.parsedData);
      
      if (success) {
        const taskData = result.parsedData;
        const dueDate = new Date(taskData.dueDate);
        const formattedDate = dueDate.toLocaleString();
        const reminderText = taskData.reminderTime === 0 ? 'right when due' : `${taskData.reminderTime} minutes before`;
        
        let successMessage = `✅ Task created successfully!\n\n`;
        successMessage += `📋 **${taskData.title}**\n`;
        successMessage += `📅 Due: ${formattedDate}\n`;
        successMessage += `⏰ Reminder: ${reminderText}`;
        
        if (taskData.description) {
          successMessage += `\n📝 Notes: ${taskData.description}`;
        }
        
        addMessageToChat('bot', successMessage);
        refreshTaskList();
      } else {
        addMessageToChat('bot', '⚠️ Task was processed but there was an issue saving it. Please check manually.');
      }
    } else {
      addMessageToChat('bot', '❌ Sorry, I had trouble processing that request. Please try again.');
    }
    
  } catch (error) {
    console.error('Chat error:', error);
    
    // Remove any processing messages
    const processingMsg = document.querySelector('.processing-message');
    if (processingMsg) {
      processingMsg.remove();
    }
    
    // More specific error messages
    if (error.message.includes('401') || error.message.includes('Authentication')) {
      addMessageToChat('bot', '🔐 Please log in to create tasks.');
    } else if (error.message.includes('404')) {
      addMessageToChat('bot', '❌ Chatbot service not found. Please check server configuration.');
    } else if (error.message.includes('Failed to fetch')) {
      addMessageToChat('bot', '📡 Connection error. Please check your internet connection.');
    } else {
      addMessageToChat('bot', `❌ Error: ${error.message}. Please try again or create the task manually.`);
    }
  }
}

// FIXED: Enhanced task creation function
async function createTaskFromChatbot(taskData) {
  try {
    console.log('Creating task from chatbot data:', taskData);
    
    // FIXED: Better task object structure
    const newTask = {
      id: Date.now().toString(),
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      dueDate: taskData.dueDate,
      reminderTime: parseInt(taskData.reminderTime) || 10,
      reminderMinutesBefore: parseInt(taskData.reminderTime) || 10,
      completed: false,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      category: 'chatbot',
      userId: 'frontend-user' // Fallback for frontend-only systems
    };
    
    // FIXED: Try multiple methods to save the task
    let taskCreated = false;
    
    // Method 1: Try existing addTask function
    if (typeof addTask === 'function') {
      try {
        const result = await addTask(newTask);
        taskCreated = !!result;
        console.log('Task created via addTask function');
      } catch (e) {
        console.warn('addTask function failed:', e);
      }
    }
    
    // Method 2: Try submitting via existing form if addTask failed
    if (!taskCreated && typeof submitTask === 'function') {
      try {
        const result = await submitTask(newTask);
        taskCreated = !!result;
        console.log('Task created via submitTask function');
      } catch (e) {
        console.warn('submitTask function failed:', e);
      }
    }
    
    // Method 3: Try creating via API directly
    if (!taskCreated) {
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newTask)
        });
        
        if (response.ok) {
          taskCreated = true;
          console.log('Task created via direct API call');
        }
      } catch (e) {
        console.warn('Direct API call failed:', e);
      }
    }
    
    // Method 4: Fallback to localStorage
    if (!taskCreated) {
      try {
        const existingTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        existingTasks.push(newTask);
        localStorage.setItem('tasks', JSON.stringify(existingTasks));
        taskCreated = true;
        console.log('Task created via localStorage');
      } catch (e) {
        console.error('localStorage fallback failed:', e);
      }
    }
    
    // Set up reminder if task was created successfully
    if (taskCreated && taskData.reminderTime && parseInt(taskData.reminderTime) > 0) {
      scheduleReminder(newTask);
    }
    
    console.log('Task creation result:', taskCreated);
    return taskCreated;
    
  } catch (error) {
    console.error('Error creating task from chatbot:', error);
    return false;
  }
}

// FIXED: Enhanced reminder scheduling
function scheduleReminder(task) {
  try {
    const dueDate = new Date(task.dueDate);
    const reminderTime = parseInt(task.reminderTime) || 10;
    const reminderDate = new Date(dueDate.getTime() - (reminderTime * 60 * 1000));
    const now = new Date();
    
    console.log('Scheduling reminder:', {
      task: task.title,
      dueDate: dueDate.toISOString(),
      reminderDate: reminderDate.toISOString(),
      minutesFromNow: Math.round((reminderDate.getTime() - now.getTime()) / 1000 / 60)
    });
    
    if (reminderDate > now) {
      const timeUntilReminder = reminderDate.getTime() - now.getTime();
      
      // Don't schedule reminders more than 24 hours in advance (browser limitations)
      if (timeUntilReminder <= 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          showReminder(task, reminderTime);
        }, timeUntilReminder);
        
        console.log(`Reminder scheduled for "${task.title}" in ${Math.round(timeUntilReminder / 1000 / 60)} minutes`);
      } else {
        console.log('Reminder too far in future, not scheduling');
      }
    } else {
      console.log('Reminder time has already passed');
    }
  } catch (error) {
    console.error('Error scheduling reminder:', error);
  }
}

// FIXED: Better reminder display
function showReminder(task, minutesBefore) {
  const reminderMessage = `⏰ Reminder: ${task.title}\nDue in ${minutesBefore} minutes`;
  
  // Try notification first
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(`Reminder: ${task.title}`, {
      body: `Due in ${minutesBefore} minutes`,
      icon: '/favicon.ico',
      tag: `reminder-${task.id}` // Prevent duplicate notifications
    });
    
    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000);
  } 
  
  // Always show alert as backup
  alert(reminderMessage);
  
  // Also add to chat if available
  if (chatMessages) {
    addMessageToChat('bot', `⏰ **Reminder Alert!**\n\n${task.title}\nDue in ${minutesBefore} minutes`);
  }
}

// FIXED: Comprehensive task list refresh function
function refreshTaskList() {
  const refreshFunctions = [
    'loadTasks',
    'renderTasks',
    'refreshTasks',
    'updateTaskList',
    'fetchTasks',
    'displayTasks'
  ];
  
  let refreshed = false;
  
  for (const funcName of refreshFunctions) {
    if (typeof window[funcName] === 'function') {
      try {
        window[funcName]();
        console.log(`Tasks refreshed using ${funcName}`);
        refreshed = true;
        break;
      } catch (e) {
        console.warn(`${funcName} failed:`, e);
      }
    }
  }
  
  if (!refreshed) {
    console.log('No task refresh function found, triggering page refresh as fallback');
    // As a last resort, refresh the page (only if we're sure tasks were created)
    setTimeout(() => {
      if (confirm('Task created! Refresh page to see it in your task list?')) {
        window.location.reload();
      }
    }, 1000);
  }
}

// FIXED: Enhanced message display
function addMessageToChat(sender, message) {
  if (!chatMessages) {
    console.log(`${sender.toUpperCase()}: ${message}`);
    if (sender === 'bot') {
      setTimeout(() => alert(`Rachel: ${message.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\n/g, ' ')}`), 100);
    }
    return null;
  }
  
  const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const messageDiv = document.createElement('div');
  messageDiv.id = messageId;
  messageDiv.className = `chat-message ${sender}-message`;
  
  if (message.includes('Processing')) {
    messageDiv.classList.add('processing-message');
  }
  
  // Better message formatting
  let formattedMessage = message
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/📋|📅|⏰|📝|✅|❌|⚠️|🔐|📡|⏰/g, '<span class="emoji">$&</span>');
  
  messageDiv.innerHTML = `
    <div class="message-content">
      <div class="message-sender">${sender === 'user' ? 'You' : 'Rachel'}</div>
      <div class="message-text">${formattedMessage}</div>
      <div class="message-time">${new Date().toLocaleTimeString()}</div>
    </div>
  `;
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return messageId;
}

function removeMessage(messageId) {
  if (messageId) {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
      messageElement.remove();
    }
  }
}

// FIXED: Better initialization
function initializeChat() {
  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      console.log('Notification permission:', permission);
    });
  }
  
  // Add welcome message only if chat is empty
  if (chatMessages && chatMessages.children.length === 0) {
    const welcomeMessage = `👋 Hi! I'm Rachel, your task assistant!

I can help you create tasks and reminders. Try saying:

• "Remind me to call mom at 3 PM"
• "Meeting tomorrow at 2:30, remind me 15 minutes before"  
• "Take out trash tonight at 8 PM"
• "Dentist appointment Friday at 10 AM"
• "Add reminder to buy groceries this evening"

Just type naturally and I'll create the task for you!`;

    addMessageToChat('bot', welcomeMessage);
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('Chatbot initializing...');
  initializeChat();
});

// FIXED: Test function with better examples
function testChatbot() {
  const testMessages = [
    "add reminder to take out trash at 3 pm",
    "remind me to call mom tomorrow at 2:30 PM, remind me 30 minutes before",
    "meeting with team on Friday at 10 AM",
    "remind me in 1 hour to check emails",
    "add task buy groceries tonight"
  ];
  
  console.log('Test messages for chatbot:', testMessages);
  
  // Test the first message
  if (testMessages.length > 0) {
    console.log('Testing with:', testMessages[0]);
    handleChatMessage(testMessages[0]);
  }
}

// Helper function for debugging
function debugChatbot() {
  console.log('Chatbot Debug Info:');
  console.log('- Chat elements found:', {
    button: !!chatbotButton,
    window: !!chatWindow,
    input: !!chatInput,
    submit: !!chatSubmit,
    messages: !!chatMessages
  });
  
  console.log('- Available task functions:', {
    addTask: typeof addTask,
    submitTask: typeof submitTask,
    loadTasks: typeof loadTasks,
    renderTasks: typeof renderTasks
  });
  
  console.log('- Notification permission:', 
    'Notification' in window ? Notification.permission : 'Not supported'
  );
}

// Expose debug function globally
window.debugChatbot = debugChatbot;
window.testChatbot = testChatbot;

  // AUTHENTICATION FUNCTIONS
  async function checkAuthState() {
    try {
      console.log('🔍 Checking authentication state...');
      
      const res = await fetch('/api/auth/me', { 
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (res.ok) {
        const userData = await res.json();
        const user = userData.user || userData;
        
        if (!user) throw new Error('No user data in response');
        
        const userId = user._id || user.id || user.sub || user.googleId;
        if (!userId) throw new Error('User ID missing');
        
        currentUser = {
          id: String(userId).trim(),
          email: user.email,
          username: user.username || user.name || user.displayName || user.email.split('@')[0],
          avatar: user.avatar || user.picture || user.photo || '/default-avatar.png',
          provider: user.provider || 'google'
        };
        
        window.currentUser = currentUser;
        isAuthenticated = true;
        
        updateUserProfile();
        await loadTasks();
        showMainApp();
        return true;
      } else {
        isAuthenticated = false;
        currentUser = null;
        window.currentUser = null;
        showLoginScreen();
        return false;
      }
    } catch (error) {
      console.error('❌ Auth check error:', error);
      isAuthenticated = false;
      currentUser = null;
      window.currentUser = null;
      showLoginScreen();
      return false;
    }
  }

  // 3. Fix the showLoginScreen function - ensure proper button initialization
function showLoginScreen() {
  console.log('🔐 Showing login screen...');
  
  // Remove user banner when showing login screen
  removeUserBanner();
  
  // Hide main app elements
  const mainApp = document.getElementById('main-app');
  if (mainApp) mainApp.style.display = 'none';
  
  // Show login screen
  let loginScreen = document.getElementById('login-screen');
  if (loginScreen) {
    loginScreen.style.display = 'flex';
  } else {
    console.log('📱 Creating new login screen...');
    loginScreen = createLoginInterface();
  }
  
  // Setup listeners after a brief delay to ensure DOM is ready
  setTimeout(() => {
    setupLoginListeners();
  }, 100);
}

  // Update the showMainApp function to include the welcome message
function showMainApp() {
  const loginScreen = document.getElementById('login-screen');
  if (loginScreen) loginScreen.style.display = 'none';
  
  const mainContent = document.querySelector('.container');
  if (mainContent) mainContent.style.display = 'block';
  
  // Show welcome message
  setTimeout(() => {
    showWelcomeMessage();
  }, 500);
}
function removeUserBanner() {
  const existingBanner = document.querySelector('.user-banner');
  if (existingBanner) {
    existingBanner.remove();
    console.log('🗑️ User banner removed');
  }
}

  function createLoginInterface() {
    const loginScreen = document.createElement('div');
    loginScreen.id = 'login-screen';
    loginScreen.innerHTML = `
      <div class="login-container">
        <div class="login-content">
          <h1>🎯 Task Reminder</h1>
          <p>Organize your tasks and never miss a deadline</p>
          <button id="google-login-btn" class="login-btn">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    `;
    
    loginScreen.style.cssText = `
  position: fixed; 
  top: 0; 
  left: 0; 
  width: 100%; 
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex; 
  justify-content: center;
  align-items: center; 
  z-index: 999999;  /* Much higher z-index */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;
    
    // Add styles for login container
    const style = document.createElement('style');
    style.textContent = `
      .login-container {
        background: white;
        padding: 3rem;
        border-radius: 20px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        text-align: center;
        max-width: 400px;
        width: 90%;
      }
      .login-content h1 {
        color: #333;
        margin-bottom: 0.5rem;
        font-size: 2rem;
        font-weight: 700;
      }
      .login-content p {
        color: #666;
        margin-bottom: 2rem;
        font-size: 1.1rem;
      }
      .login-btn {
        background: white;
        border: 2px solid #ddd;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        justify-content: center;
        width: 100%;
        transition: all 0.2s ease;
      }
      .login-btn:hover {
        border-color: #4285F4;
        box-shadow: 0 4px 12px rgba(66, 133, 244, 0.2);
        transform: translateY(-1px);
      }
      .user-profile {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        padding: 8px 12px;
        border-radius: 8px;
        transition: background-color 0.2s;
      }
      .user-profile:hover {
        background-color: rgba(0,0,0,0.05);
      }
      .user-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        object-fit: cover;
      }
      .user-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        min-width: 200px;
        z-index: 1000;
        display: none;
      }
      .user-dropdown.show {
        display: block;
      }
      .dropdown-item {
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 1px solid #eee;
        transition: background-color 0.2s;
      }
      .dropdown-item:hover {
        background-color: #f5f5f5;
      }
      .dropdown-item:last-child {
        border-bottom: none;
      }
      .dropdown-item.danger {
        color: #dc3545;
      }
      .dropdown-item.danger:hover {
        background-color: #f8d7da;
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(loginScreen);
    return loginScreen;
  }

  function setupLoginListeners() {
  console.log('🔧 Setting up login listeners...');
  
  // Try both possible button IDs from your HTML
  const googleLoginBtn = document.getElementById('google-login-btn') || document.getElementById('google-login');
  console.log('🔍 Google login button found:', googleLoginBtn);
  
  if (googleLoginBtn) {
    // Remove any existing listeners to prevent duplicates
    googleLoginBtn.replaceWith(googleLoginBtn.cloneNode(true));
    const newBtn = document.getElementById('google-login-btn') || document.getElementById('google-login');
    
    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔑 Google login button clicked!');
      loginWithGoogle();
    });
    
    console.log('✅ Google login listener attached successfully');
  } else {
    console.error('❌ Google login button not found! Available buttons:', 
      Array.from(document.querySelectorAll('button, a')).map(el => ({ id: el.id, class: el.className }))
    );
  }
}

  function loginWithGoogle() {
  console.log('🔑 Initiating Google login...');
  
  // Check if we're in development or production
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const baseUrl = isDevelopment ? 'http://localhost:3000' : window.location.origin;
  
  const googleAuthUrl = `${baseUrl}/api/auth/google`;
  console.log('🌐 Redirecting to:', googleAuthUrl);
  
  // Add loading state
  const loginBtn = document.getElementById('google-login-btn') || document.getElementById('google-login');
  if (loginBtn) {
    loginBtn.innerHTML = 'Connecting...';
    loginBtn.disabled = true;
  }
  
  // Redirect to Google OAuth
  window.location.href = googleAuthUrl;
}

// Replace the existing updateUserProfile function with this enhanced version
function updateUserProfile() {
  if (!currentUser) return;
  
  // Remove existing user profile elements
  const existingProfile = document.querySelector('.user-profile-container');
  const existingBanner = document.querySelector('.user-banner');
  if (existingProfile) existingProfile.remove();
  if (existingBanner) existingBanner.remove();
  
  // Create user banner
  const userBanner = document.createElement('div');
  userBanner.className = 'user-banner';
  userBanner.innerHTML = `
    <div class="user-banner-content">
      <div class="user-info">
        <img src="${currentUser.avatar}" alt="${currentUser.username}" class="user-banner-avatar" onerror="this.src='/default-avatar.png'">
        <div class="user-details">
          <h3 class="user-name">${currentUser.username}</h3>
          <p class="user-email">${currentUser.email}</p>
        </div>
      </div>
      <div class="user-actions">
        <button class="banner-btn switch-user-btn" id="banner-switch-user" title="Switch Account">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="m22 11-3-3m0 0-3 3m3-3v12"/>
          </svg>
          Switch User
        </button>
        <button class="banner-btn logout-btn" id="banner-logout" title="Sign Out">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16,17 21,12 16,7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  `;
  
  // Add CSS styles for the banner
  const bannerStyles = document.createElement('style');
  bannerStyles.id = 'user-banner-styles';
  bannerStyles.textContent = `
    .user-banner {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 16px;
      margin-bottom: 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .user-banner-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .user-banner-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    
    .user-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .user-name {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
      color: white;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .user-email {
      font-size: 0.9rem;
      margin: 0;
      color: rgba(255, 255, 255, 0.8);
      font-weight: 400;
    }
    
    .user-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    
    .banner-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    }
    
    .banner-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.5);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    
    .banner-btn:active {
      transform: translateY(0);
    }
    
    .logout-btn:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.5);
      color: #fecaca;
    }
    
    .switch-user-btn:hover {
      background: rgba(59, 130, 246, 0.2);
      border-color: rgba(59, 130, 246, 0.5);
      color: #bfdbfe;
    }
    
    /* Mobile responsive */
    @media (max-width: 768px) {
      .user-banner-content {
        flex-direction: column;
        text-align: center;
        gap: 16px;
      }
      
      .user-info {
        flex-direction: column;
        text-align: center;
        gap: 12px;
      }
      
      .user-actions {
        width: 100%;
        justify-content: center;
        flex-wrap: wrap;
      }
      
      .banner-btn {
        flex: 1;
        min-width: 140px;
        justify-content: center;
      }
      
      .user-name {
        font-size: 1.3rem;
      }
    }
    
    @media (max-width: 480px) {
      .user-banner {
        padding: 16px;
        margin-bottom: 20px;
      }
      
      .user-banner-avatar {
        width: 50px;
        height: 50px;
      }
      
      .banner-btn {
        padding: 8px 12px;
        font-size: 0.85rem;
      }
    }
  `;
  
  // Add styles to head if not already added
  const existingStyles = document.getElementById('user-banner-styles');
  if (!existingStyles) {
    document.head.appendChild(bannerStyles);
  }
  
  // Insert banner at the top of the main container
  const mainContainer = document.querySelector('.container') || document.querySelector('main') || document.body;
  const firstChild = mainContainer.firstChild;
  
  if (firstChild) {
    mainContainer.insertBefore(userBanner, firstChild);
  } else {
    mainContainer.appendChild(userBanner);
  }
  
  // Setup event listeners
  const switchUserBtn = document.getElementById('banner-switch-user');
  const logoutBtn = document.getElementById('banner-logout');
  
  if (switchUserBtn) {
    switchUserBtn.addEventListener('click', (e) => {
      e.preventDefault();
      switchUser();
    });
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      performLogout();
    });
  }
  
  console.log('✅ User banner created successfully');
}
// Also add this enhanced function to show a welcome message
function showWelcomeMessage() {
  if (currentUser) {
    const hour = new Date().getHours();
    let greeting = 'Hello';
    
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';
    else greeting = 'Good evening';
    
    showToast(`${greeting}, ${currentUser.username}! Welcome back to Task Reminder 🎯`, 'success');
  }
}
  async function performLogout() {
  try {
    console.log('🚪 Logging out user...');
    
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (res.ok) {
      console.log('✅ Logout successful');
    } else {
      console.warn('⚠️ Logout request failed, but continuing with client-side cleanup');
    }
    
    // Clear client-side state
    isAuthenticated = false;
    currentUser = null;
    window.currentUser = null;
    allTasks = [];
    
    // Remove user banner and profile
    removeUserBanner();
    const userProfile = document.querySelector('.user-profile-container');
    if (userProfile) userProfile.remove();
    
    // Show login screen
    showLoginScreen();
    showToast('Signed out successfully', 'success');
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    // Force logout on client side even if server request fails
    isAuthenticated = false;
    currentUser = null;
    window.currentUser = null;
    allTasks = [];
    
    // Remove user banner and profile
    removeUserBanner();
    const userProfile = document.querySelector('.user-profile-container');
    if (userProfile) userProfile.remove();
    
    showLoginScreen();
    showToast('Signed out', 'info');
  }
}

  function switchUser() {
  console.log('🔄 Switching user account...');
  
  // Remove user banner before switching
  removeUserBanner();
  
  performLogout();
}

  function handleUnauthenticatedState() {
  console.log('🔒 User not authenticated - showing login screen');
  isAuthenticated = false;
  currentUser = null;
  window.currentUser = null;
  allTasks = [];
  
  // Remove user banner
  removeUserBanner();
  
  showLoginScreen();
}

  // TASK MANAGEMENT FUNCTIONS
  function getTaskId(task) {
    let id = task._id || task.id;
    if (id && typeof id === 'object' && id.toString) {
      id = id.toString();
    }
    return id ? String(id).trim() : null;
  }

  function getTaskStatus(task) {
    if (task.isCompleted) return 'completed';
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    return now > dueDate ? 'overdue' : 'pending';
  }

  function getPriorityClass(dueDate) {
    const now = new Date();
    const due = new Date(dueDate);
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);
    
    if (hoursUntilDue < 24) return 'priority-high';
    if (hoursUntilDue < 72) return 'priority-medium';
    return 'priority-low';
  }

  async function loadTasks() {
    try {
      console.log('🔄 Loading tasks for authenticated user...');
      
      if (!currentUser || !currentUser.id) {
        console.log('❌ No authenticated user - cannot load tasks');
        handleUnauthenticatedState();
        return;
      }
      
      console.log('👤 Loading tasks for user ID:', currentUser.id);
      
      const res = await fetch(API_BASE_URL, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TaskReminder-App/1.0'
        }
      });
      
      console.log('📡 Tasks API response status:', res.status);
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          console.log('🔒 Authentication failed - user session invalid');
          showToast('Session expired. Please log in again.', 'error');
          handleUnauthenticatedState();
          return;
        }
        
        if (res.status === 404) {
          console.log('📝 No tasks found for user');
          allTasks = [];
          updateStats();
          filterAndDisplayTasks();
          return;
        }
        
        throw new Error(`Server error ${res.status}: ${res.statusText}`);
      }
      
      const serverTasks = await res.json();
      console.log('📦 Raw tasks from server:', serverTasks.length, 'tasks');
      
      // Filter tasks for current user (additional security)
      const userSpecificTasks = serverTasks.tasks.filter(task => {
        const taskUserId = task.userId || task.createdBy || task.owner || task.user;
        
        if (!taskUserId) {
          console.warn('⚠️ Task without user ID found:', task.title || 'Untitled');
          return false;
        }
        
        const taskUserIdStr = String(taskUserId).trim();
        const currentUserIdStr = String(currentUser.id).trim();
        
        return taskUserIdStr === currentUserIdStr;
      });
      
      console.log(`✅ Filtered to ${userSpecificTasks.length} tasks for current user`);
      
      // Validate task IDs
      allTasks = userSpecificTasks.filter(t => getTaskId(t));
      
      updateStats();
      filterAndDisplayTasks();
      
      console.log('🎉 Tasks loaded successfully for user:', currentUser.email);
      
      if (allTasks.length === 0) {
        showToast('Welcome! Create your first task to get started.', 'info');
      }
      
    } catch (err) {
      console.error('❌ Error loading tasks:', err);
      showToast('Failed to load tasks: ' + err.message, 'error');
    }
  }

async function addTask(task) {
  try {
    console.log('➕ Adding new task:', task.title);
    console.log('Raw task data received:', task);
    
    if (!currentUser || !currentUser.id) {
      showToast('You must be logged in to create tasks', 'error');
      showLoginScreen();
      return;
    }
    
    // Validate required fields first
    if (!task.title || !task.title.trim()) {
      throw new Error('Task title is required');
    }
    
    if (!task.dueDate || task.dueDate.trim() === '') {
      throw new Error('Due date is required');
    }
    
    // Handle the date properly - don't convert to ISO immediately
    // The dueDate comes from datetime-local input as "YYYY-MM-DDTHH:mm"
    let dueDateToSend;
    
    console.log('Processing dueDate:', task.dueDate, 'Type:', typeof task.dueDate);
    
    // Create date object from the datetime-local string
    // This preserves the user's intended local time
    const localDate = new Date(task.dueDate);
    
    // Check if the date is valid
    if (isNaN(localDate.getTime())) {
      console.error('Invalid date created from:', task.dueDate);
      throw new Error('Invalid due date provided');
    }
    
    // Convert to ISO string only for server transmission
    dueDateToSend = localDate.toISOString();
    console.log('Original dueDate:', task.dueDate);
    console.log('Converted to ISO:', dueDateToSend);
    console.log('Local date object:', localDate);
    
    // Ensure reminder time is a valid number (this should be minutes, not a date)
    let reminderTimeToSend = 15; // default
    if (task.reminderTime !== undefined && task.reminderTime !== null && task.reminderTime !== '') {
      const parsedReminderTime = parseInt(task.reminderTime);
      if (!isNaN(parsedReminderTime) && parsedReminderTime >= 0) {
        reminderTimeToSend = parsedReminderTime;
      }
    }
    
    console.log('Reminder time being sent (minutes):', reminderTimeToSend);
    
    const taskWithUser = {
      title: task.title.trim(),
      description: task.description ? task.description.trim() : '',
      dueDate: dueDateToSend, // Use the properly converted ISO string
      reminderTime: reminderTimeToSend, // This is the number of minutes before due date
      isCompleted: false,
      userId: currentUser.id,
      createdBy: currentUser.id,
      userEmail: currentUser.email,
      createdAt: new Date().toISOString(),
      owner: currentUser.id
    };
    
    console.log('Final task being sent to server:', taskWithUser);
    
    // Additional validation before sending
    if (!taskWithUser.dueDate) {
      console.error('dueDate is null/undefined in final task object!');
      throw new Error('Due date processing failed');
    }
    
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(taskWithUser),
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        showToast('Authentication required. Please log in again.', 'error');
        handleUnauthenticatedState();
        return;
      }
      
      let errorText;
      try {
        const errorJson = await res.json();
        errorText = JSON.stringify(errorJson);
      } catch {
        errorText = await res.text();
      }
      
      console.error('Server error response:', errorText);
      console.error('Request body that was sent:', JSON.stringify(taskWithUser, null, 2));
      throw new Error(`Server error ${res.status}: ${errorText}`);
    }

    const newTask = await res.json();
    console.log('✅ Task created successfully:', newTask);

    await loadTasks();
    closeForm();
    showToast('Task created successfully! 🎉', 'success');
    
  } catch (err) {
    console.error('❌ Error adding task:', err);
    console.error('Stack trace:', err.stack);
    showToast('Failed to create task: ' + err.message, 'error');
  }
}
  async function updateTask(taskId, taskData) {
    try {
      console.log('📝 Updating task ID:', taskId);
      
      if (!currentUser || !currentUser.id) {
        showToast('You must be logged in to update tasks', 'error');
        showLoginScreen();
        return;
      }
      
      if (!taskId || taskId === 'undefined' || taskId === 'null') {
        throw new Error('Invalid task ID for update');
      }
      
      const taskDataWithUser = {
        ...taskData,
        userId: currentUser.id,
        updatedAt: new Date().toISOString()
      };
      
      const res = await fetch(`${API_BASE_URL}/${taskId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(taskDataWithUser),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          showToast('Authentication required. Please log in again.', 'error');
          handleUnauthenticatedState();
          return;
        }
        
        if (res.status === 404) {
          throw new Error('Task not found or you do not have permission to update it');
        }
        
        const errorText = await res.text();
        throw new Error(`Server error ${res.status}: ${errorText}`);
      }

      const updatedTask = await res.json();
      console.log('✅ Task updated successfully:', updatedTask);

      await loadTasks();
      closeForm();
      showToast('Task updated successfully!', 'success');
      
    } catch (err) {
      console.error('❌ Error updating task:', err);
      showToast('Failed to update task: ' + err.message, 'error');
    }
  }

  async function deleteTask(taskId, taskElement) {
    if (!taskId || taskId === 'undefined' || taskId === 'null') {
      showToast('Invalid task ID for deletion', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      console.log('🗑️ Deleting task ID:', taskId);
      
      const res = await fetch(`${API_BASE_URL}/${taskId}`, { 
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          showToast('Authentication required. Please log in again.', 'error');
          handleUnauthenticatedState();
          return;
        }
        
        const errorText = await res.text();
        if (res.status === 404) {
          throw new Error(`Task not found for deletion. ID: ${taskId} may be invalid.`);
        }
        
        throw new Error(`Failed to delete task: ${errorText}`);
      }
      
      expandedTasks.delete(taskId);
      
      if (taskElement) {
        taskElement.style.transform = 'translateX(-100%)';
        taskElement.style.opacity = '0';
        
        setTimeout(() => {
          if (taskElement.parentNode) {
            taskElement.parentNode.removeChild(taskElement);
          }
        }, 300);
      }
      
      await loadTasks();
      showToast('Task deleted successfully!', 'success');
    } catch (err) {
      console.error('❌ Error deleting task:', err);
      showToast('Error deleting task: ' + err.message, 'error');
      await loadTasks();
    }
  }

  async function toggleTaskCompletion(taskId, completed) {
    try {
      console.log('🔄 Toggling task completion:', { taskId, completed });
      
      if (!taskId || taskId === 'undefined' || taskId === 'null' || taskId === '') {
        throw new Error('Invalid task ID provided');
      }
      
      const cleanTaskId = String(taskId).trim();
      
      const task = allTasks.find(t => {
        const currentTaskId = getTaskId(t);
        return currentTaskId === cleanTaskId;
      });
      
      if (!task) {
        throw new Error(`Task with ID ${cleanTaskId} not found in local data`);
      }
      
      const updateData = {
        title: task.title,
        description: task.description || '',
        dueDate: task.dueDate,
        reminderTime: task.reminderTime || 15,
        isCompleted: completed
      };
      
      const response = await fetch(`${API_BASE_URL}/${cleanTaskId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          showToast('Authentication required. Please log in again.', 'error');
          handleUnauthenticatedState();
          return;
        }
        
        const errorText = await response.text();
        if (response.status === 404) {
          throw new Error(`Task not found on server. ID: ${cleanTaskId} may be invalid or task may have been deleted.`);
        }
        
        throw new Error(`Server error ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log('✅ Update successful:', responseData);
      
      const taskIndex = allTasks.findIndex(t => getTaskId(t) === cleanTaskId);
      if (taskIndex !== -1) {
        allTasks[taskIndex].isCompleted = completed;
      }
      
      updateStats();
      filterAndDisplayTasks();
      
      showToast(completed ? 'Task completed! ✅' : 'Task marked as pending! 📝', 'success');
      
    } catch (error) {
      console.error('❌ Toggle completion error:', error);
      showToast(`Failed to update task: ${error.message}`, 'error');
      await loadTasks();
    }
  }

  // UI FUNCTIONS
  // Replace your existing renderTask function with this fixed version:

function renderTask(task) {
  const li = document.createElement('li');
  li.classList.add('task-item');
  
  const taskId = getTaskId(task);
  
  if (!taskId) {
    console.error('❌ Task has no valid ID, skipping render:', task);
    return document.createElement('li');
  }
  
  li.dataset.id = taskId;
  
  const status = getTaskStatus(task);
  if (status === 'completed') li.classList.add('completed');
  if (status === 'overdue') li.classList.add('overdue');
  li.classList.add(getPriorityClass(task.dueDate));

  // Fix date parsing - ensure we have a valid date
  let dueDate;
  if (task.dueDate) {
    dueDate = new Date(task.dueDate);
  } else {
    dueDate = new Date(); // fallback to current date
  }
  
  const now = new Date();
  const isOverdue = now > dueDate && !task.isCompleted;
  
  // Fix date formatting with better error handling
  let dueDateText;
  if (isNaN(dueDate.getTime())) {
    dueDateText = 'Invalid Date';
    console.error('Invalid date for task:', task);
  } else {
    // Format date more reliably
    dueDateText = dueDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
  
  // Fix reminder time - check if it exists and is valid, otherwise default to 15
  let reminderTime = 15; // default
  if (task.reminderTime !== undefined && task.reminderTime !== null && !isNaN(task.reminderTime)) {
    reminderTime = parseInt(task.reminderTime);
  }
  
  // Convert reminder time to readable format
  let reminderText;
  if (reminderTime >= 1440) {
    const days = Math.floor(reminderTime / 1440);
    reminderText = `${days} day${days > 1 ? 's' : ''} before`;
  } else if (reminderTime >= 60) {
    const hours = Math.floor(reminderTime / 60);
    reminderText = `${hours} hour${hours > 1 ? 's' : ''} before`;
  } else {
    reminderText = `${reminderTime} minute${reminderTime > 1 ? 's' : ''} before`;
  }

  li.innerHTML = `
    <div class="task-header">
      <div class="task-checkbox ${task.isCompleted ? 'checked' : ''}" data-task-id="${taskId}">
        ${task.isCompleted ? '✓' : ''}
      </div>
      <div class="task-content">
        <h3 class="task-title ${task.isCompleted ? 'completed-text' : ''}">${task.title}</h3>
        <p class="task-description ${task.isCompleted ? 'completed-text' : ''}">${task.description || 'No description'}</p>
        <div class="task-meta">
          <div class="meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Due: ${dueDateText}</span>
          </div>
          <div class="meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12,6 12,12 16,14"></polyline>
            </svg>
            <span>Reminder: ${reminderText}</span>
          </div>
          ${isOverdue ? '<div class="meta-item overdue-badge"><span>⚠️ Overdue</span></div>' : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="action-btn edit-btn" data-task-id="${taskId}" title="Edit Task">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m18 2 4 4-11 11-4 1 1-4z"></path>
            <path d="m21.5 6.5-3.5-3.5"></path>
          </svg>
        </button>
        <button class="action-btn delete-btn" data-task-id="${taskId}" title="Delete Task">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"></polyline>
            <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2,-2V6m3,0V4a2,2 0 0,1,2,2h4a2,2 0 0,1,2,2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Attach event handlers
  const checkbox = li.querySelector('.task-checkbox');
  const editBtn = li.querySelector('.edit-btn');
  const deleteBtn = li.querySelector('.delete-btn');

  if (checkbox) {
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      const isCompleted = !task.isCompleted;
      toggleTaskCompletion(taskId, isCompleted);
    });
  }

  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      editTask(taskId);
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(taskId, li);
    });
  }

  return li;
}

function editTask(taskId) {
  const task = allTasks.find(t => getTaskId(t) === taskId);
  if (!task) {
    showToast('Task not found for editing', 'error');
    return;
  }

  isEditMode = true;
  editingTaskId = taskId;

  // Populate form with task data
  document.getElementById('title').value = task.title;
  document.getElementById('description').value = task.description || '';
  
  // Fix datetime formatting for input
  const dueDate = new Date(task.dueDate);
  if (!isNaN(dueDate.getTime())) {
    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    const hours = String(dueDate.getHours()).padStart(2, '0');
    const minutes = String(dueDate.getMinutes()).padStart(2, '0');
    
    const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
    document.getElementById('dueDate').value = formattedDate;
  }
  
  // Fix reminder time setting
  const reminderTimeSelect = document.getElementById('reminderTime');
  if (task.reminderTime !== undefined && task.reminderTime !== null) {
    reminderTimeSelect.value = task.reminderTime.toString();
  } else {
    reminderTimeSelect.value = '15'; // default
  }

  // Update form title and button
  document.querySelector('.form-title').textContent = 'Edit Task';
  document.querySelector('.submit-btn').textContent = 'Update Task';

  openForm();
}

// Also add this function to handle form submission properly
function handleTaskSubmission(formData) {
  // Make sure to properly capture and store the reminder time
  const taskData = {
    title: formData.get('title'),
    description: formData.get('description'),
    dueDate: formData.get('dueDate'),
    reminderTime: parseInt(formData.get('reminderTime')) || 15, // Ensure it's parsed as integer
    isCompleted: false,
    createdAt: new Date().toISOString()
  };
  
  // Debug log to check values
  console.log('Task data being saved:', taskData);
  
  return taskData;
}

  function filterAndDisplayTasks() {
    if (!taskList) return;

    let filteredTasks = allTasks.filter(task => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDescription = (task.description || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription) return false;
      }

      // Status filter
      if (currentFilter === 'pending') {
        return !task.isCompleted && new Date() <= new Date(task.dueDate);
      } else if (currentFilter === 'completed') {
        return task.isCompleted;
      } else if (currentFilter === 'overdue') {
        return !task.isCompleted && new Date() > new Date(task.dueDate);
      }

      return true; // 'all' filter
    });

    // Sort tasks by due date
    filteredTasks.sort((a, b) => {
      if (a.isCompleted && !b.isCompleted) return 1;
      if (!a.isCompleted && b.isCompleted) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    taskList.innerHTML = '';

    if (filteredTasks.length === 0) {
      showEmptyState();
    } else {
      hideEmptyState();
      filteredTasks.forEach(task => {
        const taskElement = renderTask(task);
        taskList.appendChild(taskElement);
      });
    }
  }

  function showEmptyState() {
    if (emptyState) {
      emptyState.style.display = 'block';
      
      // Update empty state message based on current filter
      const emptyMessage = emptyState.querySelector('.empty-message');
      if (emptyMessage) {
        let message = 'No tasks yet. Create your first task!';
        
        if (searchQuery) {
          message = `No tasks found matching "${searchQuery}"`;
        } else if (currentFilter === 'pending') {
          message = 'No pending tasks. Great job!';
        } else if (currentFilter === 'completed') {
          message = 'No completed tasks yet.';
        } else if (currentFilter === 'overdue') {
          message = 'No overdue tasks. You\'re doing great!';
        }
        
        emptyMessage.textContent = message;
      }
    }
  }

  function hideEmptyState() {
    if (emptyState) {
      emptyState.style.display = 'none';
    }
  }

  function updateStats() {
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.isCompleted).length;
    const pending = allTasks.filter(t => !t.isCompleted && new Date() <= new Date(t.dueDate)).length;
    const overdue = allTasks.filter(t => !t.isCompleted && new Date() > new Date(t.dueDate)).length;

    if (totalTasksEl) totalTasksEl.textContent = total;
    if (completedTasksEl) completedTasksEl.textContent = completed;
    if (pendingTasksEl) pendingTasksEl.textContent = pending;
    if (overdueTasksEl) overdueTasksEl.textContent = overdue;
  }

  function openForm() {
    if (addFormContainer && modalBackdrop) {
      addFormContainer.style.bottom = '0';
      /* modalBackdrop.style.display = 'block';
      document.body.style.overflow = 'hidden'; */
      
      // Focus on title input
      setTimeout(() => {
        const titleInput = document.getElementById('title');
        if (titleInput) titleInput.focus();
      }, 300);
    }
  }

  function closeForm() {
    if (addFormContainer && modalBackdrop) {
      addFormContainer.style.bottom = '-100%';
      modalBackdrop.style.display = 'none';
      document.body.style.overflow = 'auto';
    }

    // Reset form
    if (taskForm) taskForm.reset();
    
    // Reset edit mode
    isEditMode = false;
    editingTaskId = null;
    
    // Reset form title and button
    const formTitle = document.querySelector('.form-title');
    const submitBtn = document.querySelector('.submit-btn');
    if (formTitle) formTitle.textContent = 'Add New Task';
    if (submitBtn) submitBtn.textContent = 'Add Task';
  }

  function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Add toast styles if not already added
    if (!document.querySelector('#toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 20px;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          z-index: 10000;
          transform: translateX(100%);
          transition: transform 0.3s ease;
          max-width: 300px;
          word-wrap: break-word;
        }
        .toast.show {
          transform: translateX(0);
        }
        .toast-success { background-color: #10b981; }
        .toast-error { background-color: #ef4444; }
        .toast-info { background-color: #3b82f6; }
        .toast-warning { background-color: #f59e0b; }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);

    // Hide toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  // EVENT LISTENERS
  if (toggleAddBtn) {
    toggleAddBtn.addEventListener('click', openForm);
  }

  if (closeFormBtn) {
    closeFormBtn.addEventListener('click', closeForm);
  }

  if (modalBackdrop) {
    // modalBackdrop.addEventListener('click', closeForm);
  }

  // Replace your existing form submission event listener with this:// Replace your existing form submission event listener with this:
if (taskForm) {
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const dueDate = document.getElementById('dueDate').value;
    const reminderTimeElement = document.getElementById('reminderTime');
    
    // More robust reminder time capture
    let reminderTime = 15; // default
    if (reminderTimeElement && reminderTimeElement.value) {
      const parsedTime = parseInt(reminderTimeElement.value);
      if (!isNaN(parsedTime) && parsedTime >= 0) {
        reminderTime = parsedTime;
      }
    }

    console.log('Form values captured:');
    console.log('- Title:', title);
    console.log('- Description:', description);
    console.log('- Due Date (raw):', dueDate);
    console.log('- Reminder Time (parsed):', reminderTime);

    // Validation
    if (!title) {
      showToast('Please enter a task title', 'error');
      document.getElementById('title').focus();
      return;
    }

    if (!dueDate) {
      showToast('Please select a due date and time', 'error');
      document.getElementById('dueDate').focus();
      return;
    }

    // Validate that the due date is not in the past (optional)
    const selectedDate = new Date(dueDate);
    const now = new Date();
    if (selectedDate < now) {
      const confirmPastDate = confirm('The selected date is in the past. Do you want to continue?');
      if (!confirmPastDate) {
        return;
      }
    }

    // Create task data object
    const taskData = {
      title,
      description,
      dueDate, // Keep as datetime-local string format
      reminderTime, // This should be the number of minutes
      isCompleted: false
    };

    console.log('Task data being submitted:', taskData);

    // Submit the task
    if (isEditMode && editingTaskId) {
      await updateTask(editingTaskId, taskData);
    } else {
      await addTask(taskData);
    }
  });
}

  // Search functionality
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      filterAndDisplayTasks();
    });
  }

  // Filter buttons
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      filterButtons.forEach(b => b.classList.remove('active'));
      
      // Add active class to clicked button
      btn.classList.add('active');
      
      // Update current filter
      currentFilter = btn.dataset.filter || 'all';
      
      // Filter and display tasks
      filterAndDisplayTasks();
    });
  });

  // Prevent form submission on Enter in search
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
    });
  }

  // Handle browser back/forward navigation
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.formOpen) {
      openForm();
    } else {
      closeForm();
    }
  });

  // Close form on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeForm();
    }
  });

  // NOTIFICATION SYSTEM
  function checkForDueReminders() {
    if (!isAuthenticated || !allTasks.length) return;

    const now = new Date();
    
    allTasks.forEach(task => {
      if (task.isCompleted) return;
      
      const dueDate = new Date(task.dueDate);
      const reminderTime = task.reminderTime || 15;
      const reminderDate = new Date(dueDate.getTime() - (reminderTime * 60 * 1000));
      
      // Check if it's time for reminder (within 1 minute window)
      const timeDiff = Math.abs(now - reminderDate);
      if (timeDiff <= 60000) { // Within 1 minute
        showTaskReminder(task);
      }
    });
  }

  function showTaskReminder(task) {
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      const notification = new Notification('Task Reminder', {
        body: `${task.title} is due in ${task.reminderTime} minutes`,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    }

    // Also show in-app toast
    showToast(`⏰ Reminder: "${task.title}" is due in ${task.reminderTime} minutes!`, 'warning');
  }

  // Request notification permission
  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showToast('Notifications enabled! You\'ll get reminders for your tasks.', 'success');
        }
      });
    }
  }

  // Set up periodic reminder checks
  setInterval(checkForDueReminders, 60000); // Check every minute

  // INITIALIZATION
  async function initializeApp() {
    console.log('🚀 Initializing Task Reminder App...');
    
    // Request notification permission after user interaction
    setTimeout(requestNotificationPermission, 2000);
    
    // Check authentication state
    await checkAuthState();
    
    console.log('✅ App initialization complete');
  }

  // Start the app
  initializeApp();

  // SERVICE WORKER REGISTRATION (for offline support)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('✅ Service Worker registered:', registration);
        })
        .catch(error => {
          console.log('❌ Service Worker registration failed:', error);
        });
    });
  }

  // EXPORT FOR TESTING (if needed)
  window.TaskApp = {
    loadTasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    filterAndDisplayTasks,
    updateStats,
    showToast,
    checkAuthState,
    performLogout
  };

});