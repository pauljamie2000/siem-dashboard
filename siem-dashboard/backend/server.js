const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3001;
const EVENTS_FILE = path.join(__dirname, 'events.json');
const JWT_SECRET = 'supersecretkey';
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'siemdb';

app.use(cors({ origin: '*', credentials: true }));
app.use(bodyParser.json());

// MongoDB connection
let db, usersCollection;
async function connectMongo() {
  if (db) return;
  const client = new MongoClient(MONGODB_URI, { useUnifiedTopology: true });
  await client.connect();
  db = client.db(DB_NAME);
  usersCollection = db.collection('users');
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
app.post('/login', async (req, res) => {
  try {
    await connectMongo();
    const { username, password } = req.body;
    const user = await usersCollection.findOne({ username, password });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ username: user.username, clientId: user.profile.clientId, role: user.profile.role }, JWT_SECRET, { expiresIn: '2h' });
    res.json({ token, profile: user.profile });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Register (admin only)
app.post('/register', authenticateToken, async (req, res) => {
  try {
    await connectMongo();
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only admin can add users' });
    const { username, password, profile } = req.body;
    const exists = await usersCollection.findOne({ username });
    if (exists) return res.status(409).json({ message: 'User already exists' });
    await usersCollection.insertOne({ username, password, profile });
    res.json({ message: 'User registered' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (admin only)
app.get('/users', authenticateToken, async (req, res) => {
  try {
    await connectMongo();
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only admin can view users' });
    const users = await usersCollection.find({}, { projection: { password: 0 } }).toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile (admin only)
app.put('/users/:username', authenticateToken, async (req, res) => {
  try {
    await connectMongo();
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only admin can update users' });
    const { username } = req.params;
    const { profile } = req.body;
    const result = await usersCollection.updateOne({ username }, { $set: { profile } });
    if (result.matchedCount === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get SIEM events (file-based for now)
app.get('/events', authenticateToken, (req, res) => {
  const events = fs.existsSync(EVENTS_FILE) ? JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8')) : [];
  if (req.user.role === 'admin') {
    res.json(events);
  } else {
    res.json(events.filter(e => e.clientId === req.user.clientId));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SIEM backend running on http://0.0.0.0:${PORT}`);
}); 