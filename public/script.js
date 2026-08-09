/**
 * TaskFlow Frontend Javascript
 * 
 * This file handles all client-side logic:
 * 1. Fetching tasks from our Express backend API.
 * 2. Creating, updating (completed state), and deleting tasks.
 * 3. Dynamically updating the DOM (adding list elements, updating stats progress).
 * 4. Displaying sleek, auto-dismissing success and error alerts.
 */

// ==========================================
// DOM SELECTORS
// ==========================================
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todosList = document.getElementById('todos-list');
const emptyState = document.getElementById('empty-state');
const loadingIndicator = document.getElementById('loading-indicator');
const statsBar = document.getElementById('stats-bar');
const statsText = document.getElementById('stats-text');
const progressBar = document.getElementById('progress-bar');
const toastContainer = document.getElementById('toast-container');

// App state
let todos = [];

// ==========================================
// API CLIENT FUNCTIONS (AJAX / Fetch)
// ==========================================

/**
 * Fetch all tasks from the backend Express API
 */
async function fetchTodos() {
  showLoading(true);
  try {
    const response = await fetch('/api/todos');
    
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Could not fetch tasks');
    }
    
    todos = await response.json();
    renderTodos();
  } catch (error) {
    console.error('Error fetching todos:', error);
    showToast(`Error: ${error.message}`, 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Add a new task
 * @param {string} taskText The description of the task
 */
async function addTodo(taskText) {
  try {
    const response = await fetch('/api/todos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ task: taskText })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Could not add task');
    }

    const newTodo = await response.json();
    
    // Add the new task to local state and re-render
    todos.push(newTodo);
    renderTodos();
    
    showToast('Task added successfully!', 'success');
  } catch (error) {
    console.error('Error adding todo:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

/**
 * Update completed status of a task
 * @param {number|string} id Todo ID
 * @param {boolean} completed New completion status
 */
async function toggleTodoStatus(id, completed) {
  try {
    const response = await fetch(`/api/todos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ completed })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Could not update task');
    }

    const updatedTodo = await response.json();
    
    // Update task in local state and re-render
    todos = todos.map(t => t.id === id ? updatedTodo : t);
    renderTodos();
    
    const message = completed ? 'Task marked as completed!' : 'Task marked as uncompleted!';
    showToast(message, 'success');
  } catch (error) {
    console.error('Error updating todo:', error);
    showToast(`Error: ${error.message}`, 'error');
    // Refresh to restore original checkbox state on UI failure
    fetchTodos();
  }
}

/**
 * Delete a task
 * @param {number|string} id Todo ID
 */
async function deleteTodo(id) {
  try {
    const response = await fetch(`/api/todos/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Could not delete task');
    }

    // Filter out the deleted todo from local state
    todos = todos.filter(t => t.id !== id);
    renderTodos();

    showToast('Task deleted successfully!', 'success');
  } catch (error) {
    console.error('Error deleting todo:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

// ==========================================
// RENDER & DOM MANIPULATION
// ==========================================

/**
 * Draw/Redraw todos and progress stats on the page based on the current state.
 */
function renderTodos() {
  // Clear list contents
  todosList.innerHTML = '';

  // If there are no tasks, toggle visibility of empty state layout
  if (todos.length === 0) {
    todosList.classList.add('hidden');
    emptyState.classList.remove('hidden');
    statsBar.classList.add('hidden');
    return;
  }

  // Hide empty state and show list/stats
  emptyState.classList.add('hidden');
  todosList.classList.remove('hidden');
  statsBar.classList.remove('hidden');

  // Loop and append elements
  todos.forEach(todo => {
    const todoEl = createTodoElement(todo);
    todosList.appendChild(todoEl);
  });

  // Update progress stats
  updateStats();
}

/**
 * Create DOM node structure for a single Todo item
 * @param {object} todo The todo item object
 */
function createTodoElement(todo) {
  const li = document.createElement('li');
  li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
  li.dataset.id = todo.id;

  // Format creation date elegantly
  const dateFormatted = formatDate(todo.created_at);

  li.innerHTML = `
    <div class="todo-item-left">
      <label class="checkbox-container">
        <input type="checkbox" ${todo.completed ? 'checked' : ''}>
        <span class="checkmark"></span>
      </label>
      <div class="todo-content-wrapper">
        <span class="todo-text">${escapeHTML(todo.task)}</span>
        <span class="todo-date">Created ${dateFormatted}</span>
      </div>
    </div>
    <button class="btn-delete" aria-label="Delete task">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    </button>
  `;

  // Attach event listeners directly to the child controls
  
  // 1. Checkbox toggle logic
  const checkbox = li.querySelector('input[type="checkbox"]');
  checkbox.addEventListener('change', (e) => {
    toggleTodoStatus(todo.id, e.target.checked);
  });

  // 2. Delete button logic
  const deleteBtn = li.querySelector('.btn-delete');
  deleteBtn.addEventListener('click', () => {
    deleteTodo(todo.id);
  });

  return li;
}

/**
 * Updates completed count and the progress bar
 */
function updateStats() {
  const total = todos.length;
  const completed = todos.filter(t => t.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  statsText.textContent = `${completed} of ${total} task${total === 1 ? '' : 's'} completed (${percentage}%)`;
  progressBar.style.width = `${percentage}%`;
}

/**
 * Show/Hide loading spinner overlay
 */
function showLoading(isLoading) {
  if (isLoading) {
    loadingIndicator.classList.remove('hidden');
    todosList.classList.add('hidden');
  } else {
    loadingIndicator.classList.add('hidden');
  }
}

// ==========================================
// HELPERS / UTILITIES
// ==========================================

/**
 * Formats ISO timestamps into a readable relative/short string
 * @param {string} isoString 
 */
function formatDate(isoString) {
  const date = new Date(isoString);
  // Returns format like "Aug 9, 10:15 AM"
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Prevents HTML injection attacks (XSS) when outputting database text to HTML
 */
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Displays a toast alert notification popup on the page
 * @param {string} message Text to show
 * @param {'success'|'error'} type Type of notification
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Decide icon based on type
  const icon = type === 'success' 
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-message">${escapeHTML(message)}</div>
  `;

  toastContainer.appendChild(toast);

  // Remove toast automatically after 3 seconds with a slide-out transition
  setTimeout(() => {
    toast.classList.add('removing');
    // Wait for the slide-out animation to finish before removing from DOM
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 3000);
}

// ==========================================
// EVENT LISTENERS
// ==========================================

// Handle form submit for adding a new task
todoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const taskText = todoInput.value.trim();
  
  // Check and prevent adding empty tasks (front-end double validation)
  if (taskText === '') {
    showToast('Task cannot be empty!', 'error');
    return;
  }

  addTodo(taskText);
  
  // Reset input field and refocus
  todoInput.value = '';
  todoInput.focus();
});

// Load todos immediately on page load
window.addEventListener('DOMContentLoaded', fetchTodos);
