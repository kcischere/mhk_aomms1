-- MHK-AOMMS database. WARNING: this deletes and recreates the mhk_aomms database (fine for a fresh start).
DROP DATABASE IF EXISTS mhk_aomms;
CREATE DATABASE mhk_aomms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mhk_aomms;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','cashier','customer') NOT NULL DEFAULT 'customer',
  points INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'General',
  price DECIMAL(10,2) NOT NULL,
  image_url VARCHAR(500) NULL,
  available TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_menu_category (category),
  INDEX idx_menu_name (name)
);

CREATE TABLE vouchers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  value DECIMAL(10,2) NOT NULL,
  points_cost INT NOT NULL DEFAULT 0,
  expires_at DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_vouchers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  voucher_id INT NOT NULL,
  status ENUM('available','used') NOT NULL DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  order_type ENUM('pickup','dine_in') NOT NULL,
  scheduled_at DATETIME NOT NULL,
  status ENUM('Pending','Confirmed','Rejected','Preparing','Ready','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  reject_reason VARCHAR(255) NULL,
  notes VARCHAR(255) NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  customer_voucher_id INT NULL,
  payment_status ENUM('Unpaid','Paid') NOT NULL DEFAULT 'Unpaid',
  amount_received DECIMAL(10,2) NULL,
  paid_at DATETIME NULL,
  received_by INT NULL,
  handled_by INT NULL,
  points_earned INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_orders_status (status),
  INDEX idx_orders_customer (customer_id),
  FOREIGN KEY (customer_id) REFERENCES users(id),
  FOREIGN KEY (customer_voucher_id) REFERENCES customer_vouchers(id) ON DELETE SET NULL
);

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  menu_item_id INT NULL,
  name VARCHAR(120) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL
);

CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  menu_item_id INT NOT NULL,
  order_id INT NULL,
  rating TINYINT NOT NULL,
  comment TEXT NULL,
  is_hidden TINYINT(1) NOT NULL DEFAULT 0,
  hidden_by INT NULL,
  hidden_at DATETIME NULL,
  hidden_reason VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE TABLE points_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  order_id INT NULL,
  points INT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE loyalty_settings (
  id INT PRIMARY KEY,
  points_earned INT NOT NULL DEFAULT 1,
  per_amount DECIMAL(10,2) NOT NULL DEFAULT 50
);
INSERT INTO loyalty_settings (id, points_earned, per_amount) VALUES (1, 1, 50);

CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  user_name VARCHAR(150) NULL,
  role VARCHAR(20) NULL,
  action VARCHAR(50) NOT NULL,
  entity VARCHAR(50) NULL,
  entity_id INT NULL,
  details TEXT NULL,
  ip_address VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_created (created_at),
  INDEX idx_audit_action (action)
);
