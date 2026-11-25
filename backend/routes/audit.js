const router = require('express').Router();
const db = require('../config/db');
const h = require('../utils/wrap');
const { auth, requireRole } = require('../middleware/auth');

router.use(auth, requireRole('admin'));

router.get('/actions', h(async (req, res) => {
  const [r] = await db.query('SELECT DISTINCT action FROM audit_logs ORDER BY action');
  res.json(r.map((x) => x.action));
}));

router.get('/', h(async (req, res) => {
  const { q, action, role, from, to } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const w = ['1=1'], p = [];
  if (action) { w.push('action=?'); p.push(action); }
  if (role) { w.push('role=?'); p.push(role); }
  if (q) { w.push('(user_name LIKE ? OR action LIKE ? OR entity LIKE ? OR details LIKE ?)'); p.push(...Array(4).fill(`%${q}%`)); }
  if (from) { w.push('created_at>=?'); p.push(`${from} 00:00:00`); }
  if (to) { w.push('created_at<=?'); p.push(`${to} 23:59:59`); }
  const where = w.join(' AND ');
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM audit_logs WHERE ${where}`, p);
  const [rows] = await db.query(
    `SELECT * FROM audit_logs WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...p, limit, (page - 1) * limit]);
  res.json({ rows, total });
}));

module.exports = router;
