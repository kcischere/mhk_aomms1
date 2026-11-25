const router = require('express').Router();
const db = require('../config/db');
const h = require('../utils/wrap');
const audit = require('../utils/audit');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, h(async (req, res) => {
  const [[s]] = await db.query('SELECT points_earned, per_amount FROM loyalty_settings WHERE id=1');
  res.json(s);
}));

router.put('/', auth, requireRole('admin'), h(async (req, res) => {
  const earned = parseInt(req.body.points_earned, 10);
  const per = Number(req.body.per_amount);
  if (!(earned >= 1) || !(per >= 1)) return res.status(400).json({ message: 'Points earned and the spending amount must both be 1 or more' });
  const [[old]] = await db.query('SELECT points_earned, per_amount FROM loyalty_settings WHERE id=1');
  await db.query('UPDATE loyalty_settings SET points_earned=?, per_amount=? WHERE id=1', [earned, per]);
  await audit(req, 'LOYALTY_UPDATED', 'loyalty', 1, { from: old, to: { points_earned: earned, per_amount: per } });
  res.json({ points_earned: earned, per_amount: per });
}));

module.exports = router;
