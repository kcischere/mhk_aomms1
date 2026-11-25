const router = require('express').Router();
const db = require('../config/db');
const h = require('../utils/wrap');
const audit = require('../utils/audit');
const { auth, requireRole } = require('../middleware/auth');
const admin = [auth, requireRole('admin')];

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => (/^image\/(jpeg|png)$/.test(file.mimetype) ? cb(null, true) : cb(new Error('Only JPG or PNG photos are allowed'))),
});

function clean(b) {
  const name = String(b.name || '').trim();
  const price = Number(b.price);
  if (!name || !(price >= 0)) return null;
  return {
    name,
    description: b.description || null,
    category: String(b.category || 'General').trim() || 'General',
    price,
    image_url: b.image_url || null,
    available: b.available === false || b.available === 0 ? 0 : 1,
  };
}

// Public: everyone can browse the menu (with availability)
router.get('/', h(async (req, res) => {
  const { q, category } = req.query;
  const w = ['1=1'], p = [];
  if (q) { w.push('(name LIKE ? OR description LIKE ?)'); p.push(`%${q}%`, `%${q}%`); }
  if (category) { w.push('category=?'); p.push(category); }
  const [rows] = await db.query(`SELECT m.*, COALESCE(r.avg_rating,0) AS avg_rating, COALESCE(r.review_count,0) AS review_count
     FROM menu_items m
     LEFT JOIN (SELECT menu_item_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count FROM reviews WHERE is_hidden=0 GROUP BY menu_item_id) r ON r.menu_item_id=m.id
     WHERE ${w.join(' AND ')} ORDER BY m.category, m.name`, p);
  res.json(rows);
}));

router.get('/categories', h(async (req, res) => {
  const [r] = await db.query('SELECT DISTINCT category FROM menu_items ORDER BY category');
  res.json(r.map((x) => x.category));
}));

router.get('/:id', h(async (req, res) => {
  const [[row]] = await db.query(`SELECT m.*, COALESCE(r.avg_rating,0) AS avg_rating, COALESCE(r.review_count,0) AS review_count
     FROM menu_items m
     LEFT JOIN (SELECT menu_item_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count FROM reviews WHERE is_hidden=0 GROUP BY menu_item_id) r ON r.menu_item_id=m.id
     WHERE m.id=?`, [req.params.id]);
  if (!row) return res.status(404).json({ message: 'Menu item not found' });
  res.json(row);
}));

router.post('/upload', ...admin, (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ message: String(err.message).includes('too large') ? 'Photo must be 5 MB or smaller' : err.message });
    if (!req.file) return res.status(400).json({ message: 'Choose a photo first' });
    res.json({ url: '/uploads/' + req.file.filename });
  });
});

router.post('/', ...admin, h(async (req, res) => {
  const d = clean(req.body);
  if (!d) return res.status(400).json({ message: 'Name and a valid price are required' });
  const [r] = await db.query('INSERT INTO menu_items SET ?', [d]);
  await audit(req, 'MENU_CREATED', 'menu_item', r.insertId, d);
  res.status(201).json({ id: r.insertId, ...d });
}));

router.put('/:id', ...admin, h(async (req, res) => {
  const id = Number(req.params.id);
  const d = clean(req.body);
  if (!d) return res.status(400).json({ message: 'Name and a valid price are required' });
  const [[old]] = await db.query('SELECT * FROM menu_items WHERE id=?', [id]);
  if (!old) return res.status(404).json({ message: 'Menu item not found' });
  await db.query('UPDATE menu_items SET ? WHERE id=?', [d, id]);
  const changes = {};
  for (const k of Object.keys(d)) if (String(old[k] ?? '') !== String(d[k] ?? '')) changes[k] = { from: old[k], to: d[k] };
  await audit(req, 'MENU_UPDATED', 'menu_item', id, { name: old.name, changes });
  res.json({ message: 'Menu item updated' });
}));

router.patch('/:id/availability', ...admin, h(async (req, res) => {
  const id = Number(req.params.id);
  const available = req.body.available ? 1 : 0;
  const [r] = await db.query('UPDATE menu_items SET available=? WHERE id=?', [available, id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Menu item not found' });
  await audit(req, 'MENU_AVAILABILITY', 'menu_item', id, { available });
  res.json({ message: 'Availability updated' });
}));

router.delete('/:id', ...admin, h(async (req, res) => {
  const id = Number(req.params.id);
  const [[old]] = await db.query('SELECT name FROM menu_items WHERE id=?', [id]);
  if (!old) return res.status(404).json({ message: 'Menu item not found' });
  await db.query('DELETE FROM menu_items WHERE id=?', [id]);
  await audit(req, 'MENU_DELETED', 'menu_item', id, { name: old.name });
  res.json({ message: 'Menu item deleted' });
}));

module.exports = router;
