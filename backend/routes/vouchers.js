const router = require('express').Router();
const db = require('../config/db');
const h = require('../utils/wrap');
const audit = require('../utils/audit');
const { auth, requireRole } = require('../middleware/auth');
const admin = [auth, requireRole('admin')];

function clean(b) {
  const code = String(b.code || '').trim().toUpperCase();
  const value = Number(b.value);
  const points_cost = parseInt(b.points_cost, 10);
  if (!code || !(value > 0) || !(points_cost >= 0)) return null;
  return {
    code,
    description: b.description || null,
    value,
    points_cost,
    expires_at: b.expires_at || null,
    is_active: b.is_active === false || b.is_active === 0 ? 0 : 1,
  };
}

// Admin sees every voucher; other roles see only active, unexpired ones
router.get('/', auth, h(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const [rows] = await db.query(
    `SELECT * FROM vouchers ${isAdmin ? '' : 'WHERE is_active=1 AND (expires_at IS NULL OR expires_at>=CURDATE())'} ORDER BY created_at DESC`);
  res.json(rows);
}));

// Customer: vouchers they already redeemed
router.get('/mine', auth, requireRole('customer'), h(async (req, res) => {
  const [rows] = await db.query(
    `SELECT cv.id, v.code, v.description, v.value, v.expires_at,
            IF(cv.status='available' AND v.expires_at IS NOT NULL AND v.expires_at<CURDATE(),'expired',cv.status) AS status
     FROM customer_vouchers cv JOIN vouchers v ON v.id=cv.voucher_id
     WHERE cv.user_id=? ORDER BY cv.created_at DESC`, [req.user.id]);
  res.json(rows);
}));

router.post('/', ...admin, h(async (req, res) => {
  const d = clean(req.body);
  if (!d) return res.status(400).json({ message: 'Code, a value above 0 and the points cost are required' });
  const [r] = await db.query('INSERT INTO vouchers SET ?', [d]);
  await audit(req, 'VOUCHER_CREATED', 'voucher', r.insertId, d);
  res.status(201).json({ id: r.insertId, ...d });
}));

router.put('/:id', ...admin, h(async (req, res) => {
  const id = Number(req.params.id);
  const d = clean(req.body);
  if (!d) return res.status(400).json({ message: 'Code, a value above 0 and the points cost are required' });
  const [[old]] = await db.query('SELECT * FROM vouchers WHERE id=?', [id]);
  if (!old) return res.status(404).json({ message: 'Voucher not found' });
  await db.query('UPDATE vouchers SET ? WHERE id=?', [d, id]);
  const changes = {};
  for (const k of Object.keys(d)) if (String(old[k] ?? '') !== String(d[k] ?? '')) changes[k] = { from: old[k], to: d[k] };
  await audit(req, 'VOUCHER_UPDATED', 'voucher', id, { code: old.code, changes });
  res.json({ message: 'Voucher updated' });
}));

router.delete('/:id', ...admin, h(async (req, res) => {
  const id = Number(req.params.id);
  const [[old]] = await db.query('SELECT code FROM vouchers WHERE id=?', [id]);
  if (!old) return res.status(404).json({ message: 'Voucher not found' });
  const [[used]] = await db.query('SELECT COUNT(*) AS n FROM customer_vouchers WHERE voucher_id=?', [id]);
  if (used.n > 0)
    return res.status(409).json({ message: 'Customers already redeemed this voucher. Deactivate it instead of deleting it' });
  await db.query('DELETE FROM vouchers WHERE id=?', [id]);
  await audit(req, 'VOUCHER_DELETED', 'voucher', id, { code: old.code });
  res.json({ message: 'Voucher deleted' });
}));

// Customer redeems points for a voucher
router.post('/:id/redeem', auth, requireRole('customer'), h(async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[v]] = await conn.query(
      'SELECT * FROM vouchers WHERE id=? AND is_active=1 AND (expires_at IS NULL OR expires_at>=CURDATE()) FOR UPDATE', [req.params.id]);
    if (!v) { await conn.rollback(); return res.status(404).json({ message: 'Voucher is not available' }); }
    const [[u]] = await conn.query('SELECT points FROM users WHERE id=? FOR UPDATE', [req.user.id]);
    if (u.points < v.points_cost) { await conn.rollback(); return res.status(400).json({ message: `You need ${v.points_cost} points for this voucher` }); }
    await conn.query('UPDATE users SET points=points-? WHERE id=?', [v.points_cost, req.user.id]);
    await conn.query('INSERT INTO points_ledger (user_id,points,reason) VALUES (?,?,?)',
      [req.user.id, -v.points_cost, `Redeemed voucher ${v.code}`]);
    const [r] = await conn.query('INSERT INTO customer_vouchers (user_id,voucher_id) VALUES (?,?)', [req.user.id, v.id]);
    await conn.commit();
    await audit(req, 'VOUCHER_REDEEMED', 'voucher', v.id, { code: v.code, points: v.points_cost });
    res.status(201).json({ id: r.insertId });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

module.exports = router;
