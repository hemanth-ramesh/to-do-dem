require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Validate Environment Variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Check if credentials are not configured or still placeholders
const isMockMode = !supabaseUrl || !supabaseKey || 
                   supabaseUrl.includes('your-project') || 
                   supabaseKey.includes('your-anon-key');

if (isMockMode) {
  console.warn('\x1b[33m%s\x1b[0m', '========================================================================');
  console.warn('\x1b[31m%s\x1b[0m', 'WARNING: Supabase URL or Key is missing or using placeholder values.');
  console.warn('\x1b[36m%s\x1b[0m', 'INFO: Starting the application in local "Mock Database Mode".');
  console.warn('\x1b[36m%s\x1b[0m', '      Any tasks added, checked, or deleted will be saved in memory.');
  console.warn('\x1b[36m%s\x1b[0m', '      Configure the ".env" file to switch to a persistent Supabase DB.');
  console.warn('\x1b[33m%s\x1b[0m', '========================================================================');
}

// Initialize Supabase client
// If in mock mode, we initialize with dummy values to prevent crashes.
const supabase = createClient(
  isMockMode ? 'https://placeholder.supabase.co' : supabaseUrl, 
  isMockMode ? 'placeholder' : supabaseKey
);

// In-Memory Mock Database Fallback (For instant testing without setup)
let mockTodos = [
  { id: 1, task: "💡 Configure Supabase URL & Key in .env", completed: false, created_at: new Date().toISOString() },
  { id: 2, task: "🗃️ Run schema.sql in Supabase SQL editor", completed: false, created_at: new Date().toISOString() },
  { id: 3, task: "🎉 Enjoy testing TaskFlow!", completed: true, created_at: new Date().toISOString() }
];
let mockIdCounter = 4;

// Middleware
app.use(express.json()); // To parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' directory

// ==========================================
// API ENDPOINTS
// ==========================================

/**
 * GET /api/todos
 * Retrieves all todo items.
 */
app.get('/api/todos', async (req, res) => {
  if (isMockMode) {
    return res.json(mockTodos);
  }

  try {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching todos:', error.message);
    res.status(500).json({ error: 'Failed to retrieve todos: ' + error.message });
  }
});

/**
 * POST /api/todos
 * Creates a new todo item. Expects { task: "text" } in request body.
 */
app.post('/api/todos', async (req, res) => {
  const { task } = req.body;

  // Validation: Prevent adding empty tasks
  if (!task || typeof task !== 'string' || task.trim() === '') {
    return res.status(400).json({ error: 'Task content cannot be empty' });
  }

  const cleanTask = task.trim();

  if (isMockMode) {
    const newTodo = {
      id: mockIdCounter++,
      task: cleanTask,
      completed: false,
      created_at: new Date().toISOString()
    };
    mockTodos.push(newTodo);
    return res.status(201).json(newTodo);
  }

  try {
    const { data, error } = await supabase
      .from('todos')
      .insert([{ task: cleanTask, completed: false }])
      .select();

    if (error) {
      throw error;
    }

    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating todo:', error.message);
    res.status(500).json({ error: 'Failed to create todo: ' + error.message });
  }
});

/**
 * PUT /api/todos/:id
 * Updates the completion status of a todo item. Expects { completed: boolean } in request body.
 */
app.put('/api/todos/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { completed } = req.body;

  // Validation: Ensure completed field is a boolean
  if (typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'Completed status must be a boolean' });
  }

  if (isMockMode) {
    const todoIndex = mockTodos.findIndex(t => t.id === id);
    if (todoIndex === -1) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    mockTodos[todoIndex].completed = completed;
    return res.json(mockTodos[todoIndex]);
  }

  try {
    const { data, error } = await supabase
      .from('todos')
      .update({ completed })
      .eq('id', req.params.id)
      .select();

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.json(data[0]);
  } catch (error) {
    console.error('Error updating todo:', error.message);
    res.status(500).json({ error: 'Failed to update todo: ' + error.message });
  }
});

/**
 * DELETE /api/todos/:id
 * Deletes a todo item from the database.
 */
app.delete('/api/todos/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isMockMode) {
    const todoIndex = mockTodos.findIndex(t => t.id === id);
    if (todoIndex === -1) {
      return res.status(404).json({ error: 'Todo not found or already deleted' });
    }
    const deleted = mockTodos.splice(todoIndex, 1)[0];
    return res.json({ message: 'Todo deleted successfully', deletedTodo: deleted });
  }

  try {
    const { data, error } = await supabase
      .from('todos')
      .delete()
      .eq('id', req.params.id)
      .select();

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Todo not found or already deleted' });
    }

    res.json({ message: 'Todo deleted successfully', deletedTodo: data[0] });
  } catch (error) {
    console.error('Error deleting todo:', error.message);
    res.status(500).json({ error: 'Failed to delete todo: ' + error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
