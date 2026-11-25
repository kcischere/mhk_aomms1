const router = require('express').Router();
const db = require('../config/db');
const h = require('../utils/wrap');
const audit = require('../utils/audit');
const { auth, requireRole } = require('../middleware/auth');
const admin = [auth, requireRole('admin')];
const customer = [auth, requireRole('customer')];

// Public: visible reviews, optionally for one menu item
router.get('/', h(async (req, res) => {
  const w = ['r.is_hidden=0'], p = [];
  if (req.query.menu_item_id) { w.push('r.menu_item_id=?'); p.push(req.query.menu_item_id); }
  const [rows] = await db.query(
    `SELECT r.id,r.rating,r.comment,r.created_at,u.name AS customer_name,m.name AS item_name
     FROM reviews r JOIN users u ON u.id=r.user_id JOIN menu_items m ON m.id=r.menu_item_id
     WHERE ${w.join(' AND ')} ORDER BY r.created_at DESC LIMIT 100`, p);
  res.json(rows);
}));

// Admin: every review, including hidden ones
router.get('/admin', ...admin, h(async (req, res) => {
  const { sort, q, hidden, rating } = req.query;
  const w = ['1=1'], p = [];
  if (q) { w.push('(u.name LIKE ? OR m.name LIKE ? OR r.comment LIKE ?)'); p.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (hidden === '1' || hidden === '0') { w.push('r.is_hidden=?'); p.push(Number(hidden)); }
  if (rating) { w.push('r.rating=?'); p.push(Number(rating)); }
  const order = { oldest: 'r.created_at ASC', highest: 'r.rating DESC, r.created_at DESC', lowest: 'r.rating ASC, r.created_at DESC' }[sort] || 'r.created_at DESC';
  const [rows] = await db.query(
    `SELECT r.*, u.name AS customer_name, m.name AS item_name, m.image_url, hb.name AS hidden_by_name
     FROM reviews r JOIN users u ON u.id=r.user_id JOIN menu_items m ON m.id=r.menu_item_id
     LEFT JOIN users hb ON hb.id=r.hidden_by
     WHERE ${w.join(' AND ')} ORDER BY ${order}`, p);
  res.json(rows);
}));

// Customer: items from their completed orders that they have not reviewed yet
router.get('/eligible', ...customer, h(async (req, res) => {
  const [rows] = await db.query(
    `SELECT o.id AS order_id, o.scheduled_at, oi.menu_item_id, oi.name, m.image_url
     FROM orders o JOIN order_items oi ON oi.order_id=o.id LEFT JOIN menu_items m ON m.id=oi.menu_item_id
     WHERE o.customer_id=? AND o.status='Completed' AND oi.menu_item_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.user_id=o.customer_id AND r.order_id=o.id AND r.menu_item_id=oi.menu_item_id)
     ORDER BY o.scheduled_at DESC`, [req.user.id]);
  res.json(rows);
}));

// Customer: their own reviews
router.get('/mine', ...customer, h(async (req, res) => {
  const [rows] = await db.query(
    `SELECT r.*, m.name AS item_name, m.image_url FROM reviews r JOIN menu_items m ON m.id=r.menu_item_id
     WHERE r.user_id=? ORDER BY r.created_at DESC`, [req.user.id]);
  res.json(rows);
}));

// Customer: review an item from one of their completed orders
router.post('/', ...customer, h(async (req, res) => {
  const { menu_item_id, order_id, rating, comment } = req.body || {};
  const r = parseInt(rating, 10);
  if (!menu_item_id || !(r >= 1 && r <= 5)) return res.status(400).json({ message: 'Choose an item and a rating from 1 to 5' });
  const [ok] = await db.query(
    `SELECT o.id FROM orders o JOIN order_items oi ON oi.order_id=o.id
     WHERE o.customer_id=? AND o.status='Completed' AND oi.menu_item_id=? ${order_id ? 'AND o.id=?' : ''}
     ORDER BY o.id DESC LIMIT 1`, order_id ? [req.user.id, menu_item_id, order_id] : [req.user.id, menu_item_id]);
  if (!ok.length) return res.status(403).json({ message: 'You can only review items from your completed orders' });
  const oid = ok[0].id;
  const [dup] = await db.query('SELECT id FROM reviews WHERE user_id=? AND order_id=? AND menu_item_id=?', [req.user.id, oid, menu_item_id]);
  if (dup.length) return res.status(409).json({ message: 'You already reviewed this item from that order' });
  const [ins] = await db.query('INSERT INTO reviews (user_id,menu_item_id,order_id,rating,comment) VALUES (?,?,?,?,?)',
    [req.user.id, menu_item_id, oid, r, String(comment || '').trim() || null]);
  await audit(req, 'REVIEW_POSTED', 'review', ins.insertId, { menu_item_id, rating: r });
  res.status(201).json({ id: ins.insertId });
}));

// Customer: edit own review
router.put('/:id', ...customer, h(async (req, res) => {
  const r = parseInt(req.body.rating, 10);
  if (!(r >= 1 && r <= 5)) return res.status(400).json({ message: 'Choose a rating from 1 to 5' });
  const [u] = await db.query('UPDATE reviews SET rating=?, comment=? WHERE id=? AND user_id=?',
    [r, String(req.body.comment || '').trim() || null, req.params.id, req.user.id]);
  if (!u.affectedRows) return res.status(404).json({ message: 'Review not found' });
  await audit(req, 'REVIEW_EDITED', 'review', Number(req.params.id), { rating: r });
  res.json({ message: 'Review updated' });
}));

router.patch('/:id/visibility', ...admin, h(async (req, res) => {
  const hide = req.body.is_hidden ? 1 : 0;
  const reason = String(req.body.reason || '').trim() || null;
  const [r] = hide
    ? await db.query('UPDATE reviews SET is_hidden=1, hidden_by=?, hidden_at=NOW(), hidden_reason=? WHERE id=?', [req.user.id, reason, req.params.id])
    : await db.query('UPDATE reviews SET is_hidden=0, hidden_by=NULL, hidden_at=NULL, hidden_reason=NULL WHERE id=?', [req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Review not found' });
  await audit(req, hide ? 'REVIEW_HIDDEN' : 'REVIEW_SHOWN', 'review', Number(req.params.id), reason ? { reason } : null);
  res.json({ message: 'Review updated' });
}));

// Admin can remove any review; a customer can delete their own
router.delete('/:id', auth, h(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'customer') return res.status(403).json({ message: 'Your role cannot access this' });
  const [r] = req.user.role === 'admin'
    ? await db.query('DELETE FROM reviews WHERE id=?', [req.params.id])
    : await db.query('DELETE FROM reviews WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Review not found' });
  await audit(req, 'REVIEW_DELETED', 'review', Number(req.params.id));
  res.json({ message: 'Review deleted' });
}));

module.exports = router;
