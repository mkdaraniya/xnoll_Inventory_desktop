-- Unified baseline migration (non-live project)
-- This file contains the complete latest schema.

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  company_name TEXT,
  currency TEXT DEFAULT 'INR',
  auto_generate_sku INTEGER DEFAULT 1,
  sku_prefix TEXT DEFAULT 'SKU',
  language TEXT DEFAULT 'en',
  enable_tax INTEGER DEFAULT 1,
  default_tax_name TEXT DEFAULT 'Tax',
  default_tax_rate REAL DEFAULT 0,
  default_tax_mode TEXT DEFAULT 'exclusive',
  tax_scheme TEXT DEFAULT 'simple',
  default_gst_tax_type TEXT DEFAULT 'intra',
  cgst_label TEXT DEFAULT 'CGST',
  sgst_label TEXT DEFAULT 'SGST',
  igst_label TEXT DEFAULT 'IGST',
  enable_lot_tracking INTEGER DEFAULT 1,
  enable_batch_tracking INTEGER DEFAULT 0,
  enable_expiry_tracking INTEGER DEFAULT 1,
  enable_manufacture_date INTEGER DEFAULT 0,
  invoice_prefix TEXT DEFAULT 'INV',
  invoice_terms TEXT DEFAULT '',
  invoice_footer TEXT DEFAULT 'Thank you for your business!',
  invoice_show_company_address INTEGER DEFAULT 1,
  invoice_show_company_phone INTEGER DEFAULT 1,
  invoice_show_company_email INTEGER DEFAULT 1,
  invoice_show_company_tax_id INTEGER DEFAULT 1,
  invoice_show_due_date INTEGER DEFAULT 1,
  invoice_show_notes INTEGER DEFAULT 1,
  invoice_decimal_places INTEGER DEFAULT 2,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO settings (
  id,
  company_name,
  currency,
  auto_generate_sku,
  sku_prefix,
  language,
  enable_tax,
  default_tax_name,
  default_tax_rate,
  default_tax_mode,
  tax_scheme,
  default_gst_tax_type,
  cgst_label,
  sgst_label,
  igst_label,
  enable_lot_tracking,
  enable_batch_tracking,
  enable_expiry_tracking,
  enable_manufacture_date,
  invoice_prefix,
  invoice_terms,
  invoice_footer,
  invoice_show_company_address,
  invoice_show_company_phone,
  invoice_show_company_email,
  invoice_show_company_tax_id,
  invoice_show_due_date,
  invoice_show_notes,
  invoice_decimal_places
) VALUES (
  1,
  'My Company',
  'INR',
  1,
  'SKU',
  'en',
  1,
  'Tax',
  0,
  'exclusive',
  'simple',
  'intra',
  'CGST',
  'SGST',
  'IGST',
  1,
  0,
  1,
  0,
  'INV',
  '',
  'Thank you for your business!',
  1,
  1,
  1,
  1,
  1,
  1,
  2
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  price REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  default_tax_id INTEGER,
  category TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

CREATE TABLE IF NOT EXISTS tax_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  rate REAL NOT NULL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tax_rates_name ON tax_rates(name);
CREATE INDEX IF NOT EXISTS idx_tax_rates_active ON tax_rates(is_active);

INSERT OR IGNORE INTO tax_rates (id, name, rate, is_active, is_default) VALUES
  (1, 'GST 0%', 0, 1, 0),
  (2, 'GST 5%', 5, 1, 0),
  (3, 'GST 12%', 12, 1, 0),
  (4, 'GST 18%', 18, 1, 1),
  (5, 'GST 28%', 28, 1, 0);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT UNIQUE,
  customer_id INTEGER,
  subtotal REAL DEFAULT 0,
  tax_total REAL DEFAULT 0,
  tax_name TEXT DEFAULT 'Tax',
  tax_rate REAL DEFAULT 0,
  tax_mode TEXT DEFAULT 'exclusive',
  tax_type TEXT DEFAULT 'simple',
  tax_breakup TEXT DEFAULT '{}',
  total REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  balance_due REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  invoice_date TEXT NOT NULL,
  due_date TEXT,
  status TEXT DEFAULT 'unpaid',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  product_id INTEGER,
  description TEXT,
  qty REAL DEFAULT 1,
  unit_price REAL DEFAULT 0,
  line_subtotal REAL DEFAULT 0,
  tax_id INTEGER,
  tax_name TEXT,
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  line_total REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  payment_date TEXT NOT NULL,
  payment_method TEXT,
  reference_no TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_date ON invoice_payments(payment_date);

CREATE TABLE IF NOT EXISTS custom_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  is_required INTEGER DEFAULT 0,
  display_in_grid INTEGER DEFAULT 0,
  display_in_filter INTEGER DEFAULT 0,
  is_sortable INTEGER DEFAULT 0,
  is_searchable INTEGER DEFAULT 0,
  options TEXT,
  default_value TEXT,
  field_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(module, field_name)
);

CREATE TABLE IF NOT EXISTS custom_field_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  custom_field_id INTEGER NOT NULL,
  record_id INTEGER NOT NULL,
  value TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (custom_field_id) REFERENCES custom_fields(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_custom_field_values ON custom_field_values(custom_field_id, record_id);

CREATE TABLE IF NOT EXISTS company (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  logo TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_id TEXT,
  currency TEXT DEFAULT 'INR',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  time_format TEXT DEFAULT '12h',
  legal_name TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  pan TEXT DEFAULT '',
  state_code TEXT DEFAULT '',
  business_registration_no TEXT DEFAULT '',
  contact_person TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  bank_account_number TEXT DEFAULT '',
  bank_ifsc TEXT DEFAULT '',
  bank_branch TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO company (id, name, currency) VALUES (1, 'My Company', 'INR');

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT,
  color TEXT DEFAULT '#ffffff',
  is_pinned INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at DESC);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  tax_number TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_number TEXT UNIQUE,
  supplier_id INTEGER,
  order_date TEXT NOT NULL,
  expected_date TEXT,
  status TEXT DEFAULT 'draft',
  total_amount REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_number ON purchase_orders(po_number);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_order_id INTEGER NOT NULL,
  product_id INTEGER,
  description TEXT,
  qty REAL DEFAULT 0,
  unit_cost REAL DEFAULT 0,
  line_total REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_po_items_order ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_product ON purchase_order_items(product_id);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  movement_type TEXT NOT NULL,
  quantity REAL NOT NULL,
  reference_type TEXT,
  reference_id INTEGER,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);

CREATE TABLE IF NOT EXISTS warehouses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  is_active INTEGER DEFAULT 1,
  is_primary INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_warehouses_name ON warehouses(name);

INSERT OR IGNORE INTO warehouses (id, code, name, is_active, is_primary)
VALUES (1, 'MAIN', 'Main Warehouse', 1, 1);

CREATE TABLE IF NOT EXISTS warehouse_stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  warehouse_id INTEGER NOT NULL,
  on_hand REAL DEFAULT 0,
  reserved REAL DEFAULT 0,
  available REAL DEFAULT 0,
  avg_cost REAL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, warehouse_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_warehouse_stock_product ON warehouse_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse ON warehouse_stock(warehouse_id);

CREATE TABLE IF NOT EXISTS product_reorder_levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  warehouse_id INTEGER NOT NULL,
  reorder_point REAL DEFAULT 0,
  safety_stock REAL DEFAULT 0,
  preferred_stock REAL DEFAULT 0,
  lead_time_days INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, warehouse_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reorder_product ON product_reorder_levels(product_id);
CREATE INDEX IF NOT EXISTS idx_reorder_warehouse ON product_reorder_levels(warehouse_id);

CREATE TABLE IF NOT EXISTS inventory_lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  warehouse_id INTEGER NOT NULL,
  lot_number TEXT NOT NULL,
  expiry_date TEXT,
  manufacture_date TEXT,
  received_date TEXT,
  quantity_available REAL DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, warehouse_id, lot_number),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lots_product_warehouse ON inventory_lots(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_lots_expiry ON inventory_lots(expiry_date);

CREATE TABLE IF NOT EXISTS stock_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  warehouse_id INTEGER NOT NULL,
  lot_id INTEGER,
  txn_type TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_cost REAL DEFAULT 0,
  reference_type TEXT,
  reference_id INTEGER,
  notes TEXT,
  txn_date TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (lot_id) REFERENCES inventory_lots(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_txn_product ON stock_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_txn_warehouse ON stock_transactions(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_txn_date ON stock_transactions(txn_date);
CREATE INDEX IF NOT EXISTS idx_stock_txn_type ON stock_transactions(txn_type);
