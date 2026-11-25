const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const h = require('../utils/wrap');
const audit = require('../utils/audit');
const { auth, requireRole } = require('../middleware/auth');

router.use(auth, requireRole('admin'));
const ROLES = ['admin', 'cashier', 'customer'];

router.get('/', h(async (req, res) => {
  const { role, q } = req.query;
  const w = ['1=1'], p = [];
  if (role) { w.push('role=?'); p.push(role); }
  if (q) { w.push('(name LIKE ? OR email LIKE ?)'); p.push(`%${q}%`, `%${q}%`); }
  const [rows] = await db.query(
    `SELECT id,name,email,role,points,is_active,created_at FROM users WHERE ${w.join(' AND ')} ORDER BY created_at DESC`, p);
  res.json(rows);
}));

router.post('/', h(async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password || !ROLES.includes(role)) return res.status(400).json({ message: 'Name, email, password and role are required' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
  const mail = email.trim().toLowerCase();
  const [r] = await db.query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',
    [name.trim(), mail, await bcrypt.hash(password, 10), role]);
  await audit(req, 'USER_CREATED', 'user', r.insertId, { email: mail, role });
  res.status(201).json({ id: r.insertId });
}));

router.patch('/:id', h(async (req, res) => {
  const id = Number(req.params.id);
  const [[u]] = await db.query('SELECT * FROM users WHERE id=?', [id]);
  if (!u) return res.status(404).json({ message: 'User not found' });

  const { name, role, is_active, password } = req.body || {};
  const act = is_active === undefined ? undefined : (is_active ? 1 : 0);
  if (id === req.user.id && ((role && role !== u.role) || act === 0))
    return res.status(400).json({ message: 'You cannot change your own role or deactivate your own account' });
  if (role && !ROLES.includes(role)) return res.status(400).json({ message: 'Invalid role' });

  const sets = [], p = [], changes = {};
  if (name && name !== u.name) { sets.push('name=?'); p.push(name.trim()); changes.name = { from: u.name, to: name.trim() }; }
  if (role && role !== u.role) { sets.push('role=?'); p.push(role); changes.role = { from: u.role, to: role }; }
  if (act !== undefined && act !== u.is_active) { sets.push('is_active=?'); p.push(act); changes.is_active = { from: u.is_active, to: act }; }
  if (password) {
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    sets.push('password_hash=?'); p.push(await bcrypt.hash(password, 10)); changes.password = 'reset';
  }
  if (!sets.length) return res.json({ message: 'No changes' });

  await db.query(`UPDATE users SET ${sets.join(',')} WHERE id=?`, [...p, id]);
  await audit(req, 'USER_UPDATED', 'user', id, { email: u.email, changes });
  res.json({ message: 'User updated' });
}));

module.exports = router;
