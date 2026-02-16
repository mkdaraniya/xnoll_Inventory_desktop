-- Pro inventory features: multi-warehouse, reorder points, lot/expiry, stock ledger

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
