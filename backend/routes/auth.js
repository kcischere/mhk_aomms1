const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const h = require('../utils/wrap');
const audit = require('../utils/audit');
const { auth } = require('../middleware/auth');

const sign = (u) => jwt.sign({ id: u.id, name: u.name, role: u.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Return my account, including the join date (used by the Account page)
router.get('/me', auth, h(async (req, res) => {
  const [rows] = await db.query('SELECT id,name,email,role,points,created_at FROM users WHERE id=?', [req.user.id]);
  if (!rows.length) return res.status(404).json({ message: 'Account not found' });
  res.json(rows[0]);
}));

// Public sign-up: always creates a CUSTOMER. Staff accounts are created by the admin.
router.post('/register', h(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
  if (!EMAIL.test(email)) return res.status(400).json({ message: 'Enter a valid email address' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

  const mail = email.trim().toLowerCase();
  const [dup] = await db.query('SELECT id FROM users WHERE email=?', [mail]);
  if (dup.length) return res.status(409).json({ message: 'An account with this email already exists' });

  const hash = await bcrypt.hash(password, 10);
  const [r] = await db.query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',
    [name.trim(), mail, hash, 'customer']);
  const user = { id: r.insertId, name: name.trim(), role: 'customer' };
  await audit(req, 'REGISTER', 'user', r.insertId, { email: mail }, user);
  res.status(201).json({ token: sign(user), user: { ...user, email: mail } });
}));

router.post('/login', h(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Enter your email and password' });
  const mail = email.trim().toLowerCase();

  const [rows] = await db.query('SELECT * FROM users WHERE email=?', [mail]);
  const u = rows[0];
  const ok = u && (await bcrypt.compare(password, u.password_hash));
  if (!ok) {
    await audit(req, 'LOGIN_FAILED', 'user', u ? u.id : null, { email: mail }, { id: u ? u.id : null, name: mail, role: u ? u.role : null });
    return res.status(401).json({ message: 'Incorrect email or password' });
  }
  if (!u.is_active) return res.status(403).json({ message: 'This account is deactivated. Contact the restaurant' });

  const user = { id: u.id, name: u.name, role: u.role };
  await audit(req, 'LOGIN', 'user', u.id, null, user);
  res.json({ token: sign(user), user: { ...user, email: u.email } });
}));

router.post('/logout', auth, h(async (req, res) => {
  await audit(req, 'LOGOUT', 'user', req.user.id);
  res.json({ message: 'Logged out' });
}));

router.get('/me', auth, h(async (req, res) => {
  const [rows] = await db.query('SELECT id,name,email,role,points FROM users WHERE id=?', [req.user.id]);
  if (!rows.length) return res.status(404).json({ message: 'Account not found' });
  res.json(rows[0]);
}));

// Update my own name and email (used by the Account page)
router.patch('/profile', auth, h(async (req, res) => {
  const { name, email } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ message: 'Name is required' });
  if (!email || !EMAIL.test(email)) return res.status(400).json({ message: 'Enter a valid email address' });

  const mail = String(email).trim().toLowerCase();
  const [dup] = await db.query('SELECT id FROM users WHERE email=? AND id<>?', [mail, req.user.id]);
  if (dup.length) return res.status(409).json({ message: 'An account with this email already exists' });

  await db.query('UPDATE users SET name=?, email=? WHERE id=?', [String(name).trim(), mail, req.user.id]);
  const user = { id: req.user.id, name: String(name).trim(), role: req.user.role };
  await audit(req, 'PROFILE_UPDATED', 'user', req.user.id, { email: mail });
  res.json({ token: sign(user), user: { ...user, email: mail } });
}));

// Change my own password (used by the Account page)
router.patch('/password', auth, h(async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) {
    return res.status(400).json({ message: 'Enter your current and new password' });
  }
  const np = String(new_password);
  if (np.length < 8 || !/[A-Za-z]/.test(np) || !/\d/.test(np)) {
    return res.status(400).json({ message: 'Use at least 8 characters with a mix of letters and numbers' });
  }
  const [rows] = await db.query('SELECT password_hash FROM users WHERE id=?', [req.user.id]);
  if (!rows.length || !(await bcrypt.compare(current_password, rows[0].password_hash))) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }
  const hash = await bcrypt.hash(np, 10);
  await db.query('UPDATE users SET password_hash=? WHERE id=?', [hash, req.user.id]);
  await audit(req, 'PASSWORD_CHANGED', 'user', req.user.id);
  res.json({ message: 'Password updated' });
}));

module.exports = router;
