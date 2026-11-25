require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:4200' }));
app.use(express.json());
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/vouchers', require('./routes/vouchers'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/loyalty', require('./routes/loyalty'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/customer', require('./routes/customer'));

app.use((req, res) => res.status(404).json({ message: 'Not found' }));
app.use((err, req, res, next) => {
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'That value already exists' });
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MHK API running on http://localhost:${PORT}`));
