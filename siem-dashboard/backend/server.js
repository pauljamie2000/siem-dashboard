const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const USERS_FILE = path.join(__dirname, 'users.json');
const JWT_SECRET = 'supersecretkey';

app.use(cors({ origin: 'https://your-siem-frontend.netlify.app', credentials: true }));
app.use(bodyParser.json());

// Helper: Load users
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}
// Helper: Save users
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}
// Initialize with default user if file doesn't exist
if (!fs.existsSync(USERS_FILE)) {
  saveUsers([
    { username: 'wyatt', password: 'hamre', profile: { name: 'Wyatt', role: 'admin' } }
  ]);
}
// Middleware: Authenticate JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}
// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ token, profile: user.profile });
});
// Register
app.post('/register', authenticateToken, (req, res) => {
  const { username, password, profile } = req.body;
  let users = loadUsers();
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ message: 'User already exists' });
  }
  users.push({ username, password, profile });
  saveUsers(users);
  res.json({ message: 'User registered' });
});
// Get all users
app.get('/users', authenticateToken, (req, res) => {
  const users = loadUsers().map(u => ({ username: u.username, profile: u.profile }));
  res.json(users);
});
// Update user profile
app.put('/users/:username', authenticateToken, (req, res) => {
  const { username } = req.params;
  const { profile } = req.body;
  let users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.profile = profile;
  saveUsers(users);
  res.json({ message: 'Profile updated' });
});
app.listen(PORT, '0.0.0.0', () => {
  console.log(`SIEM backend running on http://0.0.0.0:${PORT}`);
}); 