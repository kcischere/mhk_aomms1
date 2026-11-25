// Creates the first admin + cashier accounts and a few sample menu items.
// Run once:  node seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./config/db');

(async () => {
  const accounts = [
    ['Mr. Hungry Admin', 'admin@mhk.com', 'Admin@12345', 'admin'],
    ['Cashier One', 'cashier@mhk.com', 'Cashier@12345', 'cashier'],
  ];
  for (const [name, email, pw, role] of accounts) {
    const [x] = await db.query('SELECT id FROM users WHERE email=?', [email]);
    if (x.length) { console.log('Already exists:', email); continue; }
    await db.query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',
      [name, email, await bcrypt.hash(pw, 10), role]);
    console.log(`Created ${role}: ${email} / ${pw}`);
  }
  const [[m]] = await db.query('SELECT COUNT(*) AS n FROM menu_items');
  if (!m.n) {
    await db.query('INSERT INTO menu_items (name,description,category,price,available) VALUES ?', [[
      ['Chicken Adobo Rice', 'Classic adobo with garlic rice', 'Meals', 145, 1],
      ['Beef Tapa Rice', 'Cured beef, egg, garlic rice', 'Meals', 165, 1],
      ['Iced Tea', 'House blend, 16oz', 'Drinks', 55, 1],
    ]]);
    console.log('Added sample menu items');
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
