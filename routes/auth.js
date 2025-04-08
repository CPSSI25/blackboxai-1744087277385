const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Load user data
const usersPath = path.join(__dirname, '../data/users.json');

// Login endpoint
router.post('/login', (req, res) => {
  const { username, password, role } = req.body;
  const users = JSON.parse(fs.readFileSync(usersPath)).users;

  const user = users.find(u => 
    u.username === username && 
    u.password === password && 
    u.role === role
  );

  if (user) {
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      school: user.school || null
    };
    res.json({ success: true, user: req.session.user });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Logout endpoint
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Registration endpoint (for HQ officers only)
router.post('/register', (req, res) => {
  if (req.session.user?.role !== 'hq_officer') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const { username, password, role, school } = req.body;
  const users = JSON.parse(fs.readFileSync(usersPath));
  
  if (users.users.some(u => u.username === username)) {
    return res.status(400).json({ success: false, message: 'Username exists' });
  }

  const newUser = {
    id: uuidv4(),
    username,
    password,
    role,
    school: role === 'principal' ? school : null
  };

  users.users.push(newUser);
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  
  res.json({ success: true, user: newUser });
});

module.exports = router;