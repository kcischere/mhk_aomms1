const router = require('express').Router();
const db = require('../config/db');
const h = require('../utils/wrap');
const audit = require('../utils/audit');
const sendMail = require('../utils/mailer');
const { auth, requireRole } = require('../middleware/auth');
const staff = [auth, requireRole('admin', 'cashier')];

const TRANSITIONS = {
  Pending: ['Confirmed', 'Rejected', 'Cancelled'],
  Confirmed: ['Preparing', 'Cancelled'],
  Preparing: ['Ready', 'Cancelled'],
  Ready: ['Completed', 'Cancelled'],
};
const round2 = (n) => Math.round(n * 100) / 100;
const REF = (id) => '#MHK-' + (1000 + id);

async function attachItems(orders) {
  if (!orders.length) return orders;
  const [items] = await db.query(
    `SELECT oi.order_id,oi.menu_item_id,oi.name,oi.price,oi.quantity,m.image_url
     FROM order_items oi LEFT JOIN menu_items m ON m.id=oi.menu_item_id WHERE oi.order_id IN (?)`, [orders.map((o) => o.id)]);
  orders.forEach((o) => { o.items = items.filter((i) => i.order_id === o.id); });
  return orders;
}

// Points a customer WOULD earn on this order if it is completed under the current loyalty rule
async function withEstimate(orders) {
  const [[s]] = await db.query('SELECT points_earned, per_amount FROM loyalty_settings WHERE id=1');
  orders.forEach((o) => { o.points_estimate = Math.floor(Number(o.total) / Number(s.per_amount)) * s.points_earned; });
  return orders;
}

const WITH_VOUCHER = `SELECT o.*, v.code AS voucher_code FROM orders o
  LEFT JOIN customer_vouchers cv ON cv.id=o.customer_voucher_id LEFT JOIN vouchers v ON v.id=cv.voucher_id`;

// ---- Customer: place an advance order ----
router.post('/', auth, requireRole('customer'), h(async (req, res) => {
  const { order_type, scheduled_at, notes, items, customer_voucher_id } = req.body || {};
  if (!['pickup', 'dine_in'].includes(order_type)) return res.status(400).json({ message: 'Choose pick-up or dine-in' });
  const when = new Date(scheduled_at);
  if (!scheduled_at || isNaN(when) || when <= new Date()) return res.status(400).json({ message: 'Choose a future date and time' });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ message: 'Your order is empty' });

  const conn = await db.getConnection();
  let orderId, total;
  try {
    await conn.beginTransaction();
    const [menu] = await conn.query('SELECT id,name,price,available FROM menu_items WHERE id IN (?)', [items.map((i) => Number(i.menu_item_id))]);
    const byId = new Map(menu.map((m) => [m.id, m]));
    let subtotal = 0;
    const lines = [];
    for (const i of items) {
      const m = byId.get(Number(i.menu_item_id));
      const qty = parseInt(i.quantity, 10);
      if (!m || !(qty > 0)) { await conn.rollback(); return res.status(400).json({ message: 'Your order has an invalid item' }); }
      if (!m.available) { await conn.rollback(); return res.status(409).json({ message: `"${m.name}" is no longer available. Remove it and try again` }); }
      subtotal += Number(m.price) * qty;
      lines.push([m.id, m.name, m.price, qty]);
    }
    subtotal = round2(subtotal);

    let discount = 0, cvId = null;
    if (customer_voucher_id) {
      const [[cv]] = await conn.query(
        `SELECT cv.id, v.value FROM customer_vouchers cv JOIN vouchers v ON v.id=cv.voucher_id
         WHERE cv.id=? AND cv.user_id=? AND cv.status='available' AND (v.expires_at IS NULL OR v.expires_at>=CURDATE()) FOR UPDATE`,
        [customer_voucher_id, req.user.id]);
      if (!cv) { await conn.rollback(); return res.status(400).json({ message: 'That voucher cannot be used' }); }
      discount = Math.min(Number(cv.value), subtotal);
      cvId = cv.id;
      await conn.query("UPDATE customer_vouchers SET status='used' WHERE id=?", [cv.id]);
    }

    total = round2(subtotal - discount);
    const [o] = await conn.query(
      'INSERT INTO orders (customer_id,order_type,scheduled_at,notes,subtotal,discount,total,customer_voucher_id) VALUES (?,?,?,?,?,?,?,?)',
      [req.user.id, order_type, String(scheduled_at).replace('T', ' '), notes || null, subtotal, discount, total, cvId]);
    orderId = o.insertId;
    await conn.query('INSERT INTO order_items (order_id,menu_item_id,name,price,quantity) VALUES ?', [lines.map((l) => [orderId, ...l])]);
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }

  await audit(req, 'ORDER_PLACED', 'order', orderId, { total, order_type });
  const [[cu]] = await db.query('SELECT name,email FROM users WHERE id=?', [req.user.id]);
  sendMail(cu.email, `We received your order ${REF(orderId)}`,
    `Hi ${cu.name},\n\nThanks for ordering ahead! Order ${REF(orderId)} is in. Total to pay at the restaurant: PHP ${total.toFixed(2)}.\nWe will email you when the status changes.\n\nMr. Hungry Kitchen`);
  res.status(201).json({ id: orderId });
}));

// ---- Customer: own orders ----
router.get('/mine', auth, requireRole('customer'), h(async (req, res) => {
  const [rows] = await db.query(`${WITH_VOUCHER} WHERE o.customer_id=? ORDER BY o.created_at DESC, o.id DESC`, [req.user.id]);
  res.json(await withEstimate(await attachItems(rows)));
}));

// ---- One order: the owner (customer) or staff ----
router.get('/:id', auth, h(async (req, res) => {
  const [rows] = await db.query(`${WITH_VOUCHER} WHERE o.id=?`, [req.params.id]);
  const o = rows[0];
  if (!o || (req.user.role === 'customer' && o.customer_id !== req.user.id)) return res.status(404).json({ message: 'Order not found' });
  await attachItems([o]);
  await withEstimate([o]);
  res.json(o);
}));

// ---- Staff: all orders (admin + cashier), with filters and paging ----
router.get('/', ...staff, h(async (req, res) => {
  const { status, q, type, date, sort } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const w = ['1=1'], p = [];
  if (status) { w.push('o.status=?'); p.push(status); }
  if (type) { w.push('o.order_type=?'); p.push(type); }
  if (date === 'today') w.push('DATE(o.scheduled_at)=CURDATE()');
  if (date === 'upcoming') w.push('DATE(o.scheduled_at)>CURDATE()');
  if (date === 'past') w.push('DATE(o.scheduled_at)<CURDATE()');
  if (q) {
    const n = parseInt(String(q).replace(/\D/g, ''), 10) || 0;
    w.push('(u.name LIKE ? OR u.email LIKE ? OR o.id=?)');
    p.push(`%${q}%`, `%${q}%`, n >= 1000 ? n - 1000 : n);
  }
  const where = w.join(' AND ');
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM orders o JOIN users u ON u.id=o.customer_id WHERE ${where}`, p);
  const [rows] = await db.query(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email, v.code AS voucher_code
     FROM orders o JOIN users u ON u.id=o.customer_id
     LEFT JOIN customer_vouchers cv ON cv.id=o.customer_voucher_id LEFT JOIN vouchers v ON v.id=cv.voucher_id
     WHERE ${where} ORDER BY o.scheduled_at ${sort === 'asc' ? 'ASC' : 'DESC'}, o.id DESC LIMIT ? OFFSET ?`,
    [...p, limit, (page - 1) * limit]);
  res.json({ rows: await attachItems(rows), total });
}));

// ---- Staff: confirm / reject / progress / complete ----
router.patch('/:id/status', ...staff, h(async (req, res) => {
  const id = Number(req.params.id);
  const { status, reason } = req.body || {};
  const conn = await db.getConnection();
  let o, pts = 0;
  try {
    await conn.beginTransaction();
    [[o]] = await conn.query('SELECT * FROM orders WHERE id=? FOR UPDATE', [id]);
    if (!o) { await conn.rollback(); return res.status(404).json({ message: 'Order not found' }); }
    if (!(TRANSITIONS[o.status] || []).includes(status)) {
      await conn.rollback();
      return res.status(400).json({ message: `An order that is ${o.status} cannot change to ${status}` });
    }
    if (status === 'Rejected' && !String(reason || '').trim()) { await conn.rollback(); return res.status(400).json({ message: 'Give a reason for rejecting the order' }); }
    if (status === 'Completed' && o.payment_status !== 'Paid') { await conn.rollback(); return res.status(400).json({ message: 'Receive the payment before completing the order' }); }

    if (status === 'Completed') {
      const [[s]] = await conn.query('SELECT points_earned, per_amount FROM loyalty_settings WHERE id=1');
      pts = Math.floor(Number(o.total) / Number(s.per_amount)) * s.points_earned;
      if (pts > 0) {
        await conn.query('UPDATE users SET points=points+? WHERE id=?', [pts, o.customer_id]);
        await conn.query('INSERT INTO points_ledger (user_id,order_id,points,reason) VALUES (?,?,?,?)',
          [o.customer_id, o.id, pts, `Earned from order ${REF(o.id)}`]);
      }
    }
    // Give the voucher back if the order never went through
    if ((status === 'Rejected' || status === 'Cancelled') && o.customer_voucher_id)
      await conn.query("UPDATE customer_vouchers SET status='available' WHERE id=?", [o.customer_voucher_id]);

    await conn.query('UPDATE orders SET status=?, reject_reason=?, points_earned=?, handled_by=? WHERE id=?',
      [status, status === 'Rejected' ? String(reason).trim() : o.reject_reason, status === 'Completed' ? pts : o.points_earned, req.user.id, id]);
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }

  await audit(req, 'ORDER_STATUS', 'order', id, { from: o.status, to: status, reason: reason || undefined, points_awarded: pts || undefined });
  const [[cu]] = await db.query('SELECT name,email FROM users WHERE id=?', [o.customer_id]);
  sendMail(cu.email, `Your order ${REF(id)} is now ${status}`,
    `Hi ${cu.name},\n\nYour order ${REF(id)} is now ${status}.${status === 'Rejected' ? `\nReason: ${String(reason).trim()}` : ''}${pts ? `\nYou earned ${pts} points.` : ''}\n\nMr. Hungry Kitchen`);
  res.json({ message: 'Order updated', points_awarded: pts });
}));

// ---- Staff: receive payment (cash at pick-up / in restaurant) ----
router.patch('/:id/payment', ...staff, h(async (req, res) => {
  const id = Number(req.params.id);
  const [[o]] = await db.query('SELECT * FROM orders WHERE id=?', [id]);
  if (!o) return res.status(404).json({ message: 'Order not found' });
  if (o.payment_status === 'Paid') return res.status(400).json({ message: 'This order is already paid' });
  if (['Pending', 'Rejected', 'Cancelled', 'Completed'].includes(o.status))
    return res.status(400).json({ message: o.status === 'Pending' ? 'Confirm the order before receiving payment' : `Cannot take payment for a ${o.status} order` });
  const amount = Number(req.body.amount_received);
  if (!(amount >= Number(o.total))) return res.status(400).json({ message: `Amount received is less than the order total (${Number(o.total).toFixed(2)})` });

  await db.query("UPDATE orders SET payment_status='Paid', amount_received=?, paid_at=NOW(), received_by=? WHERE id=?", [amount, req.user.id, id]);
  await audit(req, 'PAYMENT_RECEIVED', 'order', id, { total: Number(o.total), received: amount });
  res.json({ message: 'Payment recorded', change: round2(amount - Number(o.total)) });
}));

module.exports = router;
