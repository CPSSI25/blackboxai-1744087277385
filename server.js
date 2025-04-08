require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8000;

// Create data directory if not exists
if (!fs.existsSync('./data')) {
  fs.mkdirSync('./data');
}

// Initialize empty JSON files if they don't exist
const requiredFiles = {
  './data/users.json': { users: [] },
  './data/applications.json': { applications: [] },
  './data/documents.json': { documents: [] }
};

Object.entries(requiredFiles).forEach(([file, defaultData]) => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/documents', require('./routes/documents'));
app.use('/teachers', require('./routes/teachers'));
app.use('/leave', require('./routes/leave'));
app.use('/messages', require('./routes/messages'));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the app at http://localhost:${PORT}`);
});