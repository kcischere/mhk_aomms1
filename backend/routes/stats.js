const router = require('express').Router();
const db = require('../config/db');
const h = require('../utils/wrap');
const { auth, requireRole } = require('../middleware/auth');

const hourLabel = (h24) => `${((h24 + 11) % 12) + 1}:00 ${h24 < 12 ? 'AM' : 'PM'}`;

router.get('/', auth, requireRole('admin'), h(async (req, res) => {
  const [[t]] = await db.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(order_type='pickup'),0) AS pickup,
            COALESCE(SUM(order_type='dine_in'),0) AS dine,
            COALESCE(SUM(status IN ('Pending','Confirmed')),0) AS pending,
            COALESCE(SUM(status='Preparing'),0) AS preparing,
            COALESCE(SUM(status='Ready'),0) AS ready,
            COALESCE(SUM(status='Completed'),0) AS completed
     FROM orders WHERE DATE(scheduled_at)=CURDATE()`);
  const [[s]] = await db.query(
    `SELECT COALESCE(SUM(total),0) AS sales FROM orders WHERE status='Completed' AND DATE(scheduled_at)=CURDATE()`);
  const [bars] = await db.query(
    `SELECT HOUR(scheduled_at) AS hr, SUM(total) AS total FROM orders
     WHERE status='Completed' AND DATE(scheduled_at)=CURDATE() GROUP BY hr ORDER BY hr`);
  const [un] = await db.query('SELECT name FROM menu_items WHERE available=0 ORDER BY name');
  const n = (v) => Number(v || 0);
  res.json({
    scheduled: n(t.total), pickup: n(t.pickup), dineIn: n(t.dine),
    pending: n(t.pending), preparing: n(t.preparing), ready: n(t.ready),
    inProgress: n(t.pending) + n(t.preparing) + n(t.ready),
    completed: n(t.completed), sales: n(s.sales),
    chart: bars.slice(-6).map((b) => ({ label: hourLabel(b.hr), total: n(b.total) })),
    unavailable: un.map((u) => u.name),
  });
}));

module.exports = router;
