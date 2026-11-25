const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const h = require('../utils/wrap');
const audit = require('../utils/audit');
const { auth, requireRole } = require('../middleware/auth');

const customer = [auth, requireRole('customer')];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------
// ACCOUNT
// ---------------------------------------------------------------
router.get('/account', ...customer, h(async (req, res) => {
  const [rows] = await db.query(
    'SELECT id,name,email,role,points,created_at FROM users WHERE id=?',
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ message: 'Account not found' });
  res.json(rows[0]);
}));

router.patch('/account', ...customer, h(async (req, res) => {
  const { name, email } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ message: 'Name is required' });
  if (!email || !EMAIL.test(email)) return res.status(400).json({ message: 'Enter a valid email address' });

  const mail = String(email).trim().toLowerCase();
  const [dup] = await db.query('SELECT id FROM users WHERE email=? AND id<>?', [mail, req.user.id]);
  if (dup.length) return res.status(409).json({ message: 'An account with this email already exists' });

  await db.query('UPDATE users SET name=?, email=? WHERE id=?', [String(name).trim(), mail, req.user.id]);
  await audit(req, 'ACCOUNT_UPDATED', 'user', req.user.id, { email: mail });

  const [rows] = await db.query('SELECT id,name,email,role,points FROM users WHERE id=?', [req.user.id]);
  res.json(rows[0]);
}));

router.post('/account/password', ...customer, h(async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) {
    return res.status(400).json({ message: 'Enter your current and new password' });
  }
  if (String(new_password).length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }
  const [rows] = await db.query('SELECT password_hash FROM users WHERE id=?', [req.user.id]);
  if (!rows.length || !(await bcrypt.compare(current_password, rows[0].password_hash))) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }
  const hash = await bcrypt.hash(new_password, 10);
  await db.query('UPDATE users SET password_hash=? WHERE id=?', [hash, req.user.id]);
  await audit(req, 'PASSWORD_CHANGED', 'user', req.user.id, null);
  res.json({ message: 'Password updated' });
}));

// ---------------------------------------------------------------
// REWARDS / VOUCHERS
// ---------------------------------------------------------------
router.get('/rewards', ...customer, h(async (req, res) => {
  const [[u]] = await db.query('SELECT points FROM users WHERE id=?', [req.user.id]);
  const [catalog] = await db.query(
    `SELECT id,code,description,value,points_cost,expires_at
       FROM vouchers
      WHERE is_active=1 AND points_cost>0 AND (expires_at IS NULL OR expires_at>=CURDATE())
      ORDER BY points_cost`
  );
  const [mine] = await db.query(
    `SELECT cv.id, cv.status, cv.created_at, v.code, v.description, v.value, v.expires_at
       FROM customer_vouchers cv JOIN vouchers v ON v.id=cv.voucher_id
      WHERE cv.user_id=? ORDER BY cv.created_at DESC`,
    [req.user.id]
  );
  const [ledger] = await db.query(
    `SELECT id,order_id,points,reason,created_at
       FROM points_ledger WHERE user_id=? ORDER BY created_at DESC, id DESC LIMIT 50`,
    [req.user.id]
  );
  res.json({ points: u ? u.points : 0, vouchers: catalog, my_vouchers: mine, ledger });
}));

// Vouchers the customer can use at checkout (not used, not expired)
router.get('/vouchers', ...customer, h(async (req, res) => {
  const [rows] = await db.query(
    `SELECT cv.id, v.code, v.description, v.value, v.expires_at
       FROM customer_vouchers cv JOIN vouchers v ON v.id=cv.voucher_id
      WHERE cv.user_id=? AND cv.status='available'
        AND (v.expires_at IS NULL OR v.expires_at>=CURDATE())
      ORDER BY cv.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
}));

// Spend points to get a voucher
router.post('/rewards/redeem', ...customer, h(async (req, res) => {
  const voucherId = Number((req.body || {}).voucher_id);
  if (!voucherId) return res.status(400).json({ message: 'Choose a voucher to redeem' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[v]] = await conn.query(
      `SELECT id,code,points_cost FROM vouchers
        WHERE id=? AND is_active=1 AND points_cost>0
          AND (expires_at IS NULL OR expires_at>=CURDATE())`,
      [voucherId]
    );
    if (!v) { await conn.rollback(); return res.status(404).json({ message: 'That voucher is not available' }); }

    const [[u]] = await conn.query('SELECT points FROM users WHERE id=? FOR UPDATE', [req.user.id]);
    if (!u || u.points < v.points_cost) {
      await conn.rollback();
      return res.status(400).json({ message: 'Not enough points for this voucher' });
    }

    await conn.query('UPDATE users SET points=points-? WHERE id=?', [v.points_cost, req.user.id]);
    await conn.query('INSERT INTO customer_vouchers (user_id,voucher_id) VALUES (?,?)', [req.user.id, v.id]);
    await conn.commit();

    await audit(req, 'VOUCHER_REDEEMED', 'voucher', v.id, { code: v.code, points: v.points_cost });
    res.status(201).json({ message: 'Voucher redeemed', points: u.points - v.points_cost });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));

// ---------------------------------------------------------------
// REVIEWS
// ---------------------------------------------------------------
router.get('/reviews', ...customer, h(async (req, res) => {
  const [reviews] = await db.query(
    `SELECT r.id, r.menu_item_id, r.order_id, r.rating, r.comment, r.is_hidden, r.created_at,
            m.name AS item_name, m.image_url
       FROM reviews r JOIN menu_items m ON m.id=r.menu_item_id
      WHERE r.user_id=? ORDER BY r.created_at DESC`,
    [req.user.id]
  );
  // Items from completed orders that this customer has not reviewed yet
  const [reviewable] = await db.query(
    `SELECT DISTINCT oi.menu_item_id, oi.name, o.id AS order_id, o.created_at
       FROM orders o JOIN order_items oi ON oi.order_id=o.id
      WHERE o.customer_id=? AND o.status='Completed' AND oi.menu_item_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM reviews r
           WHERE r.user_id=o.customer_id AND r.menu_item_id=oi.menu_item_id AND r.order_id=o.id)
      ORDER BY o.created_at DESC`,
    [req.user.id]
  );
  res.json({ reviews, reviewable });
}));

router.post('/reviews', ...customer, h(async (req, res) => {
  const { menu_item_id, order_id, comment } = req.body || {};
  const rating = parseInt((req.body || {}).rating, 10);
  if (!menu_item_id || !order_id) return res.status(400).json({ message: 'Choose an item to review' });
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ message: 'Rating must be 1 to 5' });

  const [ok] = await db.query(
    `SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id=o.id
      WHERE o.id=? AND o.customer_id=? AND o.status='Completed' AND oi.menu_item_id=?`,
    [order_id, req.user.id, menu_item_id]
  );
  if (!ok.length) return res.status(400).json({ message: 'You can only review items from your completed orders' });

  const [dup] = await db.query(
    'SELECT id FROM reviews WHERE user_id=? AND menu_item_id=? AND order_id=?',
    [req.user.id, menu_item_id, order_id]
  );
  if (dup.length) return res.status(409).json({ message: 'You already reviewed this item for that order' });

  const [r] = await db.query(
    'INSERT INTO reviews (user_id,menu_item_id,order_id,rating,comment) VALUES (?,?,?,?,?)',
    [req.user.id, menu_item_id, order_id, rating, comment ? String(comment).trim() : null]
  );
  await audit(req, 'REVIEW_ADDED', 'review', r.insertId, { menu_item_id, rating });
  res.status(201).json({ id: r.insertId });
}));

router.delete('/reviews/:id', ...customer, h(async (req, res) => {
  const [r] = await db.query('DELETE FROM reviews WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Review not found' });
  await audit(req, 'REVIEW_DELETED', 'review', Number(req.params.id), null);
  res.json({ message: 'Review deleted' });
}));

module.exports = router;