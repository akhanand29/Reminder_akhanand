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
  
  const API_BASE_URL = 'http://localhost:3000/api/tasks';
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

  // FIXED: Single, consistent task ID extraction function
  function getTaskId(task) {
    // Handle both MongoDB _id and regular id fields
    let id = task._id || task.id;
    
    // Convert ObjectId to string if it's an object
    if (id && typeof id === 'object' && id.toString) {
      id = id.toString();
    }
    
    // Return string version, trimmed
    return id ? String(id).trim() : null;
  }

  // Task status helpers
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

  // FIXED: Simplified and robust toggle completion function
  async function toggleTaskCompletion(taskId, completed) {
    try {
      console.log('🔄 Toggling task completion:', { taskId, completed });
      
      // Validate task ID
      if (!taskId || taskId === 'undefined' || taskId === 'null' || taskId === '') {
        throw new Error('Invalid task ID provided');
      }
      
      // Clean the task ID
      const cleanTaskId = String(taskId).trim();
      
      // Find the task in our local array to get all its data
      const task = allTasks.find(t => {
        const currentTaskId = getTaskId(t);
        return currentTaskId === cleanTaskId;
      });
      
      if (!task) {
        throw new Error(`Task with ID ${cleanTaskId} not found in local data`);
      }
      
      console.log('📝 Found task to update:', task.title);
      
      // Prepare complete task data for update
      const updateData = {
        title: task.title,
        description: task.description || '',
        dueDate: task.dueDate,
        reminderTime: task.reminderTime || 15,
        isCompleted: completed
      };
      
      console.log('📤 Sending update to:', `${API_BASE_URL}/${cleanTaskId}`);
      
      // Make the API call
      const response = await fetch(`${API_BASE_URL}/${cleanTaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error response:', errorText);
        
        if (response.status === 404) {
          throw new Error(`Task not found on server. ID: ${cleanTaskId} may be invalid or task may have been deleted.`);
        }
        
        throw new Error(`Server error ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log('✅ Update successful:', responseData);
      
      // Update local state immediately for responsive UI
      const taskIndex = allTasks.findIndex(t => getTaskId(t) === cleanTaskId);
      if (taskIndex !== -1) {
        allTasks[taskIndex].isCompleted = completed;
        console.log('📊 Updated local task state');
      }
      
      // Refresh the display
      updateStats();
      filterAndDisplayTasks();
      
      // Show success message
      showToast(completed ? 'Task completed! ✅' : 'Task marked as pending! 📝', 'success');
      
    } catch (error) {
      console.error('❌ Toggle completion error:', error);
      showToast(`Failed to update task: ${error.message}`, 'error');
      
      // Reload tasks to ensure UI consistency
      console.log('🔄 Reloading tasks to sync state...');
      await loadTasks();
    }
  }

  // FIXED: Simplified checkbox event handler
  function attachCheckboxHandler(checkbox, task, li) {
    if (!checkbox) return;
    
    checkbox.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      const taskId = getTaskId(task);
      console.log('🖱️ Checkbox clicked for task:', task.title, 'ID:', taskId);
      
      if (!taskId) {
        showToast('Error: Task ID not found', 'error');
        return;
      }
      
      // Disable checkbox during update to prevent double clicks
      checkbox.style.pointerEvents = 'none';
      checkbox.style.opacity = '0.6';
      
      try {
        // Toggle completion status
        const newCompletedState = !task.isCompleted;
        await toggleTaskCompletion(taskId, newCompletedState);
      } catch (error) {
        console.error('Checkbox toggle error:', error);
      } finally {
        // Re-enable checkbox
        checkbox.style.pointerEvents = 'auto';
        checkbox.style.opacity = '1';
      }
    });
  }

  // Edit task function
  function editTask(task) {
    console.log('✏️ Edit task called with:', task.title);
    
    const taskId = getTaskId(task);
    
    if (!taskId) {
      showToast('Cannot edit task: Invalid ID', 'error');
      return;
    }
    
    // Set edit mode
    isEditMode = true;
    editingTaskId = taskId;
    
    console.log('📝 Setting edit mode - ID:', editingTaskId);
    
    // Fill form with task data
    const titleInput = document.getElementById('title');
    const descriptionInput = document.getElementById('description');
    const dueDateInput = document.getElementById('dueDate');
    const reminderTimeInput = document.getElementById('reminderTime');
    
    if (titleInput) titleInput.value = task.title || '';
    if (descriptionInput) descriptionInput.value = task.description || '';
    if (dueDateInput) {
      // Format date for datetime-local input
      if (task.dueDate) {
        const date = new Date(task.dueDate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        dueDateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
      }
    }
    if (reminderTimeInput) reminderTimeInput.value = task.reminderTime || '15';
    
    // Update form UI
    const submitBtn = document.querySelector('button[type="submit"]');
    const formTitle = document.querySelector('.form-title');
    if (submitBtn) submitBtn.textContent = 'Update Task';
    if (formTitle) formTitle.textContent = 'Edit Task';
    
    // Show the form
    if (addFormContainer) {
      addFormContainer.style.bottom = '0';
      document.body.style.overflow = 'hidden';
    }
    
    // Show modal backdrop if it exists
    if (modalBackdrop) {
     /*  modalBackdrop.style.display = 'block';
      modalBackdrop.classList.add('show'); */
    }
    
    console.log('📝 Edit form opened for task:', task.title);
  }

  // FIXED: Render task function with consistent ID handling
  function renderTask(task) {
    const li = document.createElement('li');
    li.classList.add('task-item');
    
    const taskId = getTaskId(task);
    
    if (!taskId) {
      console.error('❌ Task has no valid ID, skipping render:', task);
      showToast('Error: Task missing ID', 'error');
      return document.createElement('li'); // Return empty element
    }
    
    li.dataset.id = taskId;
    
    const status = getTaskStatus(task);
    if (status === 'completed') li.classList.add('completed');
    if (status === 'overdue') li.classList.add('overdue');
    li.classList.add(getPriorityClass(task.dueDate));

    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const isOverdue = now > dueDate && !task.isCompleted;

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
              <span>Due: ${dueDate.toLocaleString()}</span>
            </div>
            <div class="meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12,6 12,12 16,14"></polyline>
              </svg>
              <span>Reminder: ${task.reminderTime} min before</span>
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
              <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2,-2V6m3,0V4a2,2 0 0,1,2,-2h4a2,2 0 0,1,2,2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Attach event handlers
    const checkbox = li.querySelector('.task-checkbox');
    const editBtn = li.querySelector('.edit-btn');
    const deleteBtn = li.querySelector('.delete-btn');

    // Attach checkbox handler
    attachCheckboxHandler(checkbox, task, li);

    // Edit button handler
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        editTask(task);
      });
    }

    // Delete button handler
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        deleteTask(taskId, li);
      });
    }

    return li;
  }

  // FIXED: Single, clean loadTasks function
  async function loadTasks() {
    try {
      console.log('🔄 Loading tasks from:', API_BASE_URL);
      
      const res = await fetch(API_BASE_URL);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      allTasks = await res.json();
      
      console.log('📊 Loaded tasks count:', allTasks.length);
      
      // Debug: Log task IDs to understand the structure
      console.log('🆔 Task ID samples:', allTasks.slice(0, 3).map(t => ({
        title: t.title,
        _id: t._id,
        id: t.id,
        extractedId: getTaskId(t)
      })));
      
      // Validate all tasks have proper IDs
      const tasksWithoutIds = allTasks.filter(t => !getTaskId(t));
      if (tasksWithoutIds.length > 0) {
        console.warn('⚠️ Tasks without valid IDs:', tasksWithoutIds.length);
      }
      
      updateStats();
      filterAndDisplayTasks();
      
      console.log('✅ Tasks loaded successfully');
    } catch (err) {
      console.error('❌ Error loading tasks:', err);
      showToast('Error loading tasks: ' + err.message, 'error');
      
      if (err.message.includes('Failed to fetch')) {
        showToast('Cannot connect to server. Please make sure the backend is running on port 3000.', 'error');
      }
    }
  }

  // Update existing task
  async function updateTask(taskId, taskData) {
    try {
      console.log('📝 Updating task ID:', taskId);
      console.log('📝 Update data:', taskData);
      
      if (!taskId || taskId === 'undefined' || taskId === 'null') {
        throw new Error('Invalid task ID for update');
      }
      
      const res = await fetch(`${API_BASE_URL}/${taskId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(taskData),
      });

      console.log('📡 Update response status:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Server response:', res.status, errorText);
        
        if (res.status === 404) {
          throw new Error(`Task not found for update. ID: ${taskId} may be invalid.`);
        }
        
        throw new Error(`Server error ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      console.log('✅ Update response:', data);

      await loadTasks();
      closeForm();
      showToast('Task updated successfully!', 'success');
      
    } catch (err) {
      console.error('❌ Error updating task:', err);
      showToast('Error updating task: ' + err.message, 'error');
    }
  }

  // Add task to backend
  async function addTask(task) {
    try {
      console.log('➕ Adding task:', task);
      
      const res = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(task),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Add task error:', res.status, errorText);
        throw new Error(`Server error ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      console.log('✅ Add task response:', data);

      await loadTasks();
      closeForm();
      showToast('Task added successfully!', 'success');
    } catch (err) {
      console.error('❌ Error adding task:', err);
      showToast('Error adding task: ' + err.message, 'error');
    }
  }

  // Delete task by ID
  async function deleteTask(taskId, taskElement) {
    if (!taskId || taskId === 'undefined' || taskId === 'null') {
      showToast('Invalid task ID for deletion', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      console.log('🗑️ Deleting task ID:', taskId);
      
      const res = await fetch(`${API_BASE_URL}/${taskId}`, { method: 'DELETE' });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Delete response:', res.status, errorText);
        
        if (res.status === 404) {
          throw new Error(`Task not found for deletion. ID: ${taskId} may be invalid.`);
        }
        
        throw new Error(`Failed to delete task: ${errorText}`);
      }
      
      // Remove from expanded tasks set
      expandedTasks.delete(taskId);
      
      // Add delete animation
      if (taskElement) {
        taskElement.style.transform = 'translateX(-100%)';
        taskElement.style.opacity = '0';
        
        setTimeout(() => {
          if (taskElement.parentNode) {
            taskElement.parentNode.removeChild(taskElement);
          }
        }, 300);
      }
      
      // Reload tasks to update everything
      await loadTasks();
      
      showToast('Task deleted successfully!', 'success');
    } catch (err) {
      console.error('❌ Error deleting task:', err);
      showToast('Error deleting task: ' + err.message, 'error');
      await loadTasks();
    }
  }

  // Filter and display tasks
  function filterAndDisplayTasks() {
    let filteredTasks = allTasks;

    // Apply search filter
    if (searchQuery) {
      filteredTasks = filteredTasks.filter(task => 
        task.title.toLowerCase().includes(searchQuery) ||
        (task.description && task.description.toLowerCase().includes(searchQuery))
      );
    }

    // Apply status filter
    if (currentFilter !== 'all') {
      filteredTasks = filteredTasks.filter(task => {
        const status = getTaskStatus(task);
        return status === currentFilter;
      });
    }

    // Clear and populate task list
    if (taskList) {
      taskList.innerHTML = '';
      
      if (filteredTasks.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        taskList.style.display = 'none';
      } else {
        if (emptyState) emptyState.style.display = 'none';
        taskList.style.display = 'block';
        filteredTasks.forEach(task => {
          const taskElement = renderTask(task);
          if (taskElement && getTaskId(task)) {
            taskList.appendChild(taskElement);
          }
        });
      }
    }
  }

  // Update stats
  function updateStats() {
    const total = allTasks.length;
    const completed = allTasks.filter(task => task.isCompleted).length;
    const pending = allTasks.filter(task => !task.isCompleted).length;
    const overdue = allTasks.filter(task => {
      const now = new Date();
      const dueDate = new Date(task.dueDate);
      return now > dueDate && !task.isCompleted;
    }).length;

    if (totalTasksEl) totalTasksEl.textContent = total;
    if (completedTasksEl) completedTasksEl.textContent = completed;
    if (pendingTasksEl) pendingTasksEl.textContent = pending;
    if (overdueTasksEl) overdueTasksEl.textContent = overdue;
  }

  // Toast notification system
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      z-index: 10000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 10);
    
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  // Form close handler
  function closeForm() {
    if (addFormContainer) {
      addFormContainer.style.bottom = '-100%';
    }
    if (modalBackdrop) {
     /*  modalBackdrop.style.display = 'none';
      modalBackdrop.classList.remove('show') */;
    }
    document.body.style.overflow = '';
    if (taskForm) {
      taskForm.reset();
    }
    isEditMode = false;
    editingTaskId = null;
    const submitBtn = document.querySelector('button[type="submit"]');
    const formTitle = document.querySelector('.form-title');
    if (submitBtn) submitBtn.textContent = 'Create Task';
    if (formTitle) formTitle.textContent = 'Create New Task';
  }

  // Event Listeners Setup
  if (toggleAddBtn) {
    toggleAddBtn.addEventListener('click', () => {
      if (addFormContainer) {
        addFormContainer.style.bottom = '0';
        if (modalBackdrop) {
         /*  modalBackdrop.style.display = 'block';
          modalBackdrop.classList.add('show'); */
        }
        document.body.style.overflow = 'hidden';
      }
    });
  }

  if (closeFormBtn) {
    closeFormBtn.addEventListener('click', closeForm);
  }
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', closeForm);
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      filterAndDisplayTasks();
    });
  }

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      filterAndDisplayTasks();
    });
  });

  // Form submit handler
  if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      console.log('📝 Form submitted');
      
      const titleInput = document.getElementById('title');
      const descriptionInput = document.getElementById('description');
      const dueDateInput = document.getElementById('dueDate');
      const reminderTimeInput = document.getElementById('reminderTime');
      
      if (!titleInput || !dueDateInput) {
        showToast('Form elements not found', 'error');
        return;
      }
      
      const task = {
        title: titleInput.value.trim(),
        description: descriptionInput ? descriptionInput.value.trim() : '',
        dueDate: dueDateInput.value,
        reminderTime: reminderTimeInput ? reminderTimeInput.value || '15' : '15',
        isCompleted: false
      };
      
      if (!task.title || !task.dueDate) {
        showToast('Please fill in all required fields', 'error');
        return;
      }
      
      console.log('📝 Form submission:', { isEditMode, editingTaskId, task });
      
      if (isEditMode && editingTaskId && editingTaskId !== 'undefined') {
        await updateTask(editingTaskId, task);
      } else {
        await addTask(task);
      }
    });
  }

  // Chatbot functionality
  const chatbotButton = document.getElementById('chatbot-button');
  const chatWindow = document.getElementById('chat-window');

  if (chatbotButton && chatWindow) {
    chatbotButton.addEventListener('click', () => {
      chatWindow.style.display = chatWindow.style.display === 'none' || !chatWindow.style.display ? 'flex' : 'none';
    });

    const chatSubmitBtn = document.getElementById('chat-submit');
    if (chatSubmitBtn) {
      chatSubmitBtn.addEventListener('click', async () => {
        const input = document.getElementById('chat-input');
        if (!input) return;
        
        const message = input.value.trim();
        if (!message) return;

        try {
          const res = await fetch('http://localhost:3000/api/chatbot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
          });

          const task = await res.json();

          if (!task.title || !task.dueDate || !task.reminderTime) {
            alert('Could not understand your message.');
            return;
          }

          await addTask(task);

          alert('✅ Task added from chat!');
          input.value = '';
          chatWindow.style.display = 'none';
          await loadTasks();
        } catch (err) {
          alert('Chatbot failed: ' + err.message);
          console.error(err);
        }
      });
    }

    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const chatSubmitBtn = document.getElementById('chat-submit');
          if (chatSubmitBtn) chatSubmitBtn.click();
        }
      });
    }
  }

  // Notification and reminder setup
  if ('Notification' in window) {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }

  const reminderModal = document.getElementById('reminder-modal');
  const reminderTitle = document.getElementById('reminder-title');
  const reminderDesc = document.getElementById('reminder-desc');
  const acknowledgeBtn = document.getElementById('acknowledge-btn');

  let activeReminders = new Set();

  // Check reminders every minute
  setInterval(async () => {
    try {
      const res = await fetch(API_BASE_URL);
      if (!res.ok) throw new Error('Failed to load tasks');
      const tasks = await res.json();

      const now = new Date();

      for (const task of tasks) {
        const taskId = getTaskId(task);
        if (activeReminders.has(taskId) || task.isCompleted) continue;
        if (!task.dueDate) continue;

        const dueDate = new Date(task.dueDate);
        const reminderMinutes = parseInt(task.reminderTime, 10);
        const reminderTime = new Date(dueDate.getTime() - reminderMinutes * 60000);

        if (now >= reminderTime && now <= dueDate) {
          activeReminders.add(taskId);
          showReminder(task);
          break;
        }
      }
    } catch (err) {
      console.error('Reminder check error:', err);
    }
  }, 60000);

  function showReminder(task) {
    if (reminderTitle) reminderTitle.textContent = task.title;
    if (reminderDesc) reminderDesc.textContent = task.description || 'You have a reminder!';
    if (reminderModal) reminderModal.style.display = 'block';
    if (modalBackdrop) {
      modalBackdrop.style.display = 'block';
      modalBackdrop.classList.add('show');
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(task.title, {
        body: task.description || 'You have a reminder!',
        requireInteraction: true,
        tag: getTaskId(task),
      });
    }
  }

  if (acknowledgeBtn) {
    acknowledgeBtn.addEventListener('click', () => {
      if (reminderModal) reminderModal.style.display = 'none';
      if (modalBackdrop) {
        modalBackdrop.style.display = 'none';
        modalBackdrop.classList.remove('show');
      }
    });
  }

  // Set minimum date to current datetime
  const now = new Date();
  const dueDateInput = document.getElementById('dueDate');
  if (dueDateInput) {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    dueDateInput.min = minDateTime;
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (addFormContainer && addFormContainer.style.bottom === '0px') {
        closeForm();
      }
      if (reminderModal && reminderModal.style.display === 'block') {
        acknowledgeBtn?.click();
      }
      if (chatWindow && chatWindow.style.display === 'flex') {
        chatWindow.style.display = 'none';
      }
    }
    
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      if (toggleAddBtn) toggleAddBtn.click();
    }
  });

  // Initial load
  loadTasks();
});