// electron/database/db.js
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { app } = require("electron");

const isDev = process.env.NODE_ENV === "development";

const dbPath = isDev
  ? path.join(__dirname, "sqlite.db")
  : path.join(app.getPath("userData"), "xnoll-offline.sqlite");

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("cache_size = 1000000");
db.pragma("foreign_keys = ON");
db.pragma("temp_store = memory");

// --- migrations runner (idempotent) ---
function runMigrations() {
  const migrationsDir = path.join(__dirname, "migrations");
  if (!fs.existsSync(migrationsDir)) return;

  // Create migrations table
  db.exec(`CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY);`);

  // Prepare statements
  const getMigration = db.prepare("SELECT name FROM migrations WHERE name = ?");
  const insertMigration = db.prepare(
    "INSERT INTO migrations (name) VALUES (?)"
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  files.forEach((file) => {
    try {
      // Check if migration already applied
      const row = getMigration.get(file);
      if (row) return; // already applied

      // Apply migration
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      db.exec(sql);

      // Record migration
      insertMigration.run(file);
      console.log("Migration applied:", file);
    } catch (error) {
      console.error("Migration failed", file, error);
      throw error;
    }
  });
}

// Initialize database schema
function initDatabase() {
  // Run migrations to create/update schema
  runMigrations();
}

// Initialize database
initDatabase();

function ensureSettingsColumns() {
  const cols = db.prepare("PRAGMA table_info(settings)").all();
  const has = new Set(cols.map((c) => String(c.name || "").trim()));
  const missing = [];

  if (!has.has("enable_lot_tracking")) {
    missing.push("ALTER TABLE settings ADD COLUMN enable_lot_tracking INTEGER DEFAULT 1");
  }
  if (!has.has("enable_batch_tracking")) {
    missing.push("ALTER TABLE settings ADD COLUMN enable_batch_tracking INTEGER DEFAULT 0");
  }
  if (!has.has("enable_expiry_tracking")) {
    missing.push("ALTER TABLE settings ADD COLUMN enable_expiry_tracking INTEGER DEFAULT 1");
  }
  if (!has.has("enable_manufacture_date")) {
    missing.push("ALTER TABLE settings ADD COLUMN enable_manufacture_date INTEGER DEFAULT 0");
  }

  missing.forEach((sql) => db.exec(sql));
}

ensureSettingsColumns();

function ensureTaxSchema() {
  db.exec(`
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
  `);

  const productCols = db.prepare("PRAGMA table_info(products)").all();
  const productHas = new Set(productCols.map((c) => String(c.name || "").trim()));
  if (!productHas.has("default_tax_id")) {
    db.exec("ALTER TABLE products ADD COLUMN default_tax_id INTEGER");
  }

  const itemCols = db.prepare("PRAGMA table_info(invoice_items)").all();
  const itemHas = new Set(itemCols.map((c) => String(c.name || "").trim()));
  if (!itemHas.has("tax_id")) {
    db.exec("ALTER TABLE invoice_items ADD COLUMN tax_id INTEGER");
  }
  if (!itemHas.has("tax_name")) {
    db.exec("ALTER TABLE invoice_items ADD COLUMN tax_name TEXT");
  }
}

ensureTaxSchema();

function ensureInventoryPerformanceIndexes() {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_stock_txn_wh_prod_date ON stock_transactions(warehouse_id, product_id, txn_date DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_stock_txn_prod_date ON stock_transactions(product_id, txn_date DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_stock_txn_date_id ON stock_transactions(txn_date DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_ws_wh_prod ON warehouse_stock(warehouse_id, product_id);
    CREATE INDEX IF NOT EXISTS idx_reorder_wh_prod ON product_reorder_levels(warehouse_id, product_id);
    CREATE INDEX IF NOT EXISTS idx_lots_wh_prod_qty ON inventory_lots(warehouse_id, product_id, quantity_available);
    CREATE INDEX IF NOT EXISTS idx_lots_prod_wh_qty ON inventory_lots(product_id, warehouse_id, quantity_available);
  `);
}

ensureInventoryPerformanceIndexes();

function normalizePagination(input = {}) {
  const page = Math.max(1, Number(input.page || 1));
  const pageSizeRaw = Number(input.pageSize || 10);
  const pageSize = Math.min(100, Math.max(5, pageSizeRaw));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

function normalizeSort(input = {}, allowedSortKeys = [], defaultKey = "id") {
  const key = allowedSortKeys.includes(input.sortKey) ? input.sortKey : defaultKey;
  const dir = String(input.sortDir || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
  return { key, dir };
}

function buildSearchWhere(search, columns = []) {
  const term = String(search || "").trim();
  if (!term) return { where: "", params: [] };
  const like = `%${term}%`;
  return {
    where: ` WHERE ${columns.map((c) => `${c} LIKE ?`).join(" OR ")}`,
    params: columns.map(() => like),
  };
}

function paginateQuery({ baseFromSql, countFromSql, search, searchColumns, sort, page, pageSize }) {
  const { page: p, pageSize: ps, offset } = normalizePagination({ page, pageSize });
  const { where, params } = buildSearchWhere(search, searchColumns);
  const sortSql = ` ORDER BY ${sort.key} ${sort.dir}`;

  const total = db
    .prepare(`SELECT COUNT(*) as total ${countFromSql}${where}`)
    .get(...params).total;

  const rows = db
    .prepare(`${baseFromSql}${where}${sortSql} LIMIT ? OFFSET ?`)
    .all(...params, ps, offset);

  return {
    rows,
    total,
    page: p,
    pageSize: ps,
    totalPages: Math.max(1, Math.ceil(total / ps)),
  };
}

// --- Prepared statements ---
const statements = {
  // Settings
  getSettings: db.prepare("SELECT * FROM settings WHERE id = 1"),
  updateSettings: db.prepare(`
    UPDATE settings SET
      company_name = ?, currency = ?, auto_generate_sku = ?, sku_prefix = ?,
      language = ?, enable_tax = ?, default_tax_name = ?, default_tax_rate = ?, default_tax_mode = ?,
      tax_scheme = ?, default_gst_tax_type = ?, cgst_label = ?, sgst_label = ?, igst_label = ?,
      enable_lot_tracking = ?, enable_batch_tracking = ?, enable_expiry_tracking = ?, enable_manufacture_date = ?,
      invoice_prefix = ?, invoice_terms = ?, invoice_footer = ?,
      invoice_show_company_address = ?, invoice_show_company_phone = ?, invoice_show_company_email = ?,
      invoice_show_company_tax_id = ?, invoice_show_due_date = ?, invoice_show_notes = ?, invoice_decimal_places = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `),

  // Customers
  insertCustomer: db.prepare(`
    INSERT INTO customers (name, phone, email, address, created_at, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  updateCustomer: db.prepare(`
    UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  deleteCustomer: db.prepare("DELETE FROM customers WHERE id = ?"),
  getAllCustomers: db.prepare("SELECT * FROM customers ORDER BY id DESC"),

  // Products
  insertProduct: db.prepare(`
    INSERT INTO products (sku, name, description, unit, price, discount, category, default_tax_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  updateProduct: db.prepare(`
    UPDATE products SET sku = ?, name = ?, description = ?, unit = ?, price = ?, discount = ?, category = ?, default_tax_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  deleteProduct: db.prepare("DELETE FROM products WHERE id = ?"),
  getAllProducts: db.prepare("SELECT * FROM products ORDER BY id DESC"),

  // Tax rates
  insertTaxRate: db.prepare(`
    INSERT INTO tax_rates (name, rate, is_active, is_default, created_at, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  updateTaxRate: db.prepare(`
    UPDATE tax_rates
    SET name = ?, rate = ?, is_active = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  deleteTaxRate: db.prepare("DELETE FROM tax_rates WHERE id = ?"),
  getAllTaxRates: db.prepare("SELECT * FROM tax_rates ORDER BY is_default DESC, name ASC, id DESC"),
  getTaxRateById: db.prepare("SELECT * FROM tax_rates WHERE id = ?"),
  clearTaxRateDefault: db.prepare("UPDATE tax_rates SET is_default = 0, updated_at = CURRENT_TIMESTAMP"),
  countTaxRateUsageInProducts: db.prepare("SELECT COUNT(*) as total FROM products WHERE default_tax_id = ?"),
  countTaxRateUsageInInvoiceItems: db.prepare("SELECT COUNT(*) as total FROM invoice_items WHERE tax_id = ?"),

  // Invoices
  insertInvoice: db.prepare(`
    INSERT INTO invoices (
      invoice_number, customer_id, subtotal, tax_total, tax_name, tax_rate, tax_mode,
      tax_type, tax_breakup, total, paid_amount, balance_due, discount, invoice_date, due_date, status, notes, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  updateInvoice: db.prepare(`
    UPDATE invoices SET
      invoice_number = ?, customer_id = ?, subtotal = ?, tax_total = ?, tax_name = ?, tax_rate = ?, tax_mode = ?,
      tax_type = ?, tax_breakup = ?, total = ?, discount = ?, invoice_date = ?, due_date = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  deleteInvoice: db.prepare("DELETE FROM invoices WHERE id = ?"),
  getAllInvoices: db.prepare(`
    SELECT i.*, c.name as customer_name
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    ORDER BY i.id DESC
  `),

  // Invoice Items
  insertInvoiceItem: db.prepare(`
    INSERT INTO invoice_items (invoice_id, product_id, description, qty, unit_price, line_subtotal, tax_id, tax_name, tax_rate, tax_amount, line_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  deleteInvoiceItems: db.prepare(
    "DELETE FROM invoice_items WHERE invoice_id = ?"
  ),
  getInvoiceItems: db.prepare(
    "SELECT ii.*, tr.name AS resolved_tax_name FROM invoice_items ii LEFT JOIN tax_rates tr ON tr.id = ii.tax_id WHERE ii.invoice_id = ?"
  ),
  getInvoicePayments: db.prepare(`
    SELECT *
    FROM invoice_payments
    WHERE invoice_id = ?
    ORDER BY date(payment_date) ASC, id ASC
  `),
  getInvoicePaymentTotal: db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS paid_amount
    FROM invoice_payments
    WHERE invoice_id = ?
  `),
  insertInvoicePayment: db.prepare(`
    INSERT INTO invoice_payments (
      invoice_id, amount, payment_date, payment_method, reference_no, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  deleteInvoicePayment: db.prepare("DELETE FROM invoice_payments WHERE id = ?"),
  getInvoicePaymentById: db.prepare("SELECT * FROM invoice_payments WHERE id = ?"),
  updateInvoicePaymentSummary: db.prepare(`
    UPDATE invoices
    SET paid_amount = ?, balance_due = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  // Suppliers
  insertSupplier: db.prepare(`
    INSERT INTO suppliers (name, contact_person, phone, email, address, tax_number, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  updateSupplier: db.prepare(`
    UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, tax_number = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  deleteSupplier: db.prepare("DELETE FROM suppliers WHERE id = ?"),
  getAllSuppliers: db.prepare("SELECT * FROM suppliers ORDER BY id DESC"),
  getSupplierById: db.prepare("SELECT * FROM suppliers WHERE id = ?"),

  // Purchase Orders
  insertPurchaseOrder: db.prepare(`
    INSERT INTO purchase_orders (po_number, supplier_id, order_date, expected_date, status, total_amount, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  updatePurchaseOrder: db.prepare(`
    UPDATE purchase_orders SET po_number = ?, supplier_id = ?, order_date = ?, expected_date = ?, status = ?, total_amount = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  deletePurchaseOrder: db.prepare("DELETE FROM purchase_orders WHERE id = ?"),
  getAllPurchaseOrders: db.prepare(`
    SELECT po.*, s.name AS supplier_name
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    ORDER BY po.id DESC
  `),
  getPurchaseOrderById: db.prepare(`
    SELECT po.*, s.name AS supplier_name
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    WHERE po.id = ?
  `),
  getPurchaseOrderItems: db.prepare(
    "SELECT * FROM purchase_order_items WHERE purchase_order_id = ?"
  ),
  insertPurchaseOrderItem: db.prepare(`
    INSERT INTO purchase_order_items (purchase_order_id, product_id, description, qty, unit_cost, line_total, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  deletePurchaseOrderItems: db.prepare(
    "DELETE FROM purchase_order_items WHERE purchase_order_id = ?"
  ),

  // Stock Movements
  insertStockMovement: db.prepare(`
    INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  getAllStockMovements: db.prepare(`
    SELECT sm.*, p.name AS product_name, p.sku AS product_sku
    FROM stock_movements sm
    LEFT JOIN products p ON sm.product_id = p.id
    ORDER BY sm.id DESC
  `),
  getProductStockBalance: db.prepare(`
    SELECT COALESCE(
      SUM(
        CASE
          WHEN movement_type = 'in' THEN quantity
          WHEN movement_type = 'out' THEN -quantity
          ELSE quantity
        END
      ), 0
    ) AS stock
    FROM stock_movements
    WHERE product_id = ?
  `),
  getStockSummary: db.prepare(`
    SELECT
      p.id,
      p.sku,
      p.name,
      p.unit,
      p.price,
      COALESCE(SUM(
        CASE
          WHEN sm.movement_type = 'in' THEN sm.quantity
          WHEN sm.movement_type = 'out' THEN -sm.quantity
          ELSE sm.quantity
        END
      ), 0) AS current_stock
    FROM products p
    LEFT JOIN stock_movements sm ON sm.product_id = p.id
    GROUP BY p.id, p.sku, p.name, p.unit, p.price
    ORDER BY p.name ASC
  `),

  // Notes
  insertNote: db.prepare(`
    INSERT INTO notes (title, content, tags, color, is_pinned, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  updateNote: db.prepare(`
    UPDATE notes SET title = ?, content = ?, tags = ?, color = ?, is_pinned = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  deleteNote: db.prepare("DELETE FROM notes WHERE id = ?"),
  getAllNotes: db.prepare(
    "SELECT * FROM notes ORDER BY is_pinned DESC, created_at DESC"
  ),

  // Custom Fields
  insertCustomField: db.prepare(`
    INSERT INTO custom_fields (module, field_name, field_label, field_type, is_required, display_in_grid, display_in_filter, is_sortable, is_searchable, options, default_value, field_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  updateCustomField: db.prepare(`
    UPDATE custom_fields SET module = ?, field_name = ?, field_label = ?, field_type = ?, is_required = ?, display_in_grid = ?, display_in_filter = ?, is_sortable = ?, is_searchable = ?, options = ?, default_value = ?, field_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  deleteCustomField: db.prepare("DELETE FROM custom_fields WHERE id = ?"),
  getAllCustomFields: db.prepare(`
    SELECT
      id,
      field_name as name,
      field_label as label,
      module,
      field_type as type,
      is_required as required,
      display_in_grid,
      display_in_filter,
      is_sortable as sortable,
      is_searchable as searchable,
      options,
      default_value,
      field_order,
      created_at,
      updated_at
    FROM custom_fields ORDER BY field_order, id
  `),
  getCustomFieldValues: db.prepare(
    "SELECT value FROM custom_field_values WHERE custom_field_id = ? AND record_id = ?"
  ),
  saveCustomFieldValue: db.prepare(`
    INSERT OR REPLACE INTO custom_field_values (custom_field_id, record_id, value, created_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),

  // Company Profile
  getCompanyProfile: db.prepare("SELECT * FROM company WHERE id = 1"),
  updateCompanyProfile: db.prepare(`
    INSERT OR REPLACE INTO company (
      id, name, logo, address, city, state, postal_code, country,
      phone, email, website, tax_id, currency, timezone, date_format, time_format,
      legal_name, gstin, pan, state_code, business_registration_no, contact_person,
      bank_name, bank_account_number, bank_ifsc, bank_branch
    ) VALUES (
      1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `),

  // SKU validation
  checkSkuExists: db.prepare(
    "SELECT id FROM products WHERE sku = ? AND id != ?"
  ),
};

// Helper function for custom fields
function getAllCustomFields(module) {
  const allFields = statements.getAllCustomFields.all();
  return module ? allFields.filter((f) => f.module === module) : allFields;
}

// --- Helper functions ---
function attachCustomFieldsToRows(module, rows = []) {
  const customFields = getAllCustomFields(module);
  if (!customFields.length) return rows;

  for (const row of rows) {
    row.custom_fields = {};
    for (const field of customFields) {
      const valueRow = statements.getCustomFieldValues.get(field.id, row.id);
      if (valueRow) row.custom_fields[field.name] = valueRow.value;
    }
  }
  return rows;
}

function getCustomersWithCustomFields() {
  return attachCustomFieldsToRows("customers", statements.getAllCustomers.all());
}

function getProductsWithCustomFields() {
  return attachCustomFieldsToRows("products", statements.getAllProducts.all());
}

function getInvoiceById(id) {
  const invoice = db
    .prepare(
      `
    SELECT i.*, c.name as customer_name
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    WHERE i.id = ?
  `
    )
    .get(id);

  if (invoice) {
    invoice.items = statements.getInvoiceItems.all(id);
    invoice.payments = statements.getInvoicePayments.all(id);
    if (invoice.paid_amount == null || invoice.balance_due == null) {
      const paidAmount = toMoney(
        statements.getInvoicePaymentTotal.get(id)?.paid_amount || 0
      );
      invoice.paid_amount = paidAmount;
      invoice.balance_due = toMoney(Math.max(0, Number(invoice.total || 0) - paidAmount));
    }
  }
  return invoice || null;
}

function getInvoicesWithItems() {
  const invoices = statements.getAllInvoices.all();
  const products = statements.getAllProducts.all();
  const productMap = {};
  products.forEach((p) => (productMap[p.id] = p));

  for (const invoice of invoices) {
    invoice.items = statements.getInvoiceItems.all(invoice.id);
    if (invoice.paid_amount == null || invoice.balance_due == null) {
      const paidAmount = toMoney(
        statements.getInvoicePaymentTotal.get(invoice.id)?.paid_amount || 0
      );
      invoice.paid_amount = paidAmount;
      invoice.balance_due = toMoney(
        Math.max(0, Number(invoice.total || 0) - paidAmount)
      );
    }

    // Enrich items with product name if available
    if (Array.isArray(invoice.items)) {
      invoice.items = invoice.items.map((item) => ({
        ...item,
        product_name:
          productMap[item.product_id]?.name ||
          item.description ||
          "Unknown Item",
      }));
    } else {
      invoice.items = [];
    }
  }

  return invoices;
}

function validateSupplierPayload(data) {
  const name = String(data?.name || "").trim();
  const email = String(data?.email || "").trim();
  const phone = String(data?.phone || "").trim();

  if (!name) throw new Error("Supplier name is required");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid supplier email");
  }
  if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) {
    throw new Error("Invalid supplier phone");
  }
}

function getSuppliers() {
  return attachCustomFieldsToRows("suppliers", statements.getAllSuppliers.all());
}

function createPurchaseOrderWithItems(data) {
  return db.transaction(() => {
    if (!data?.order_date) throw new Error("Order date is required");
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("Purchase order must contain at least one item");
    }

    const poNumber = String(data.po_number || "").trim();
    const status = String(data.status || "draft").trim().toLowerCase();
    const allowedStatus = ["draft", "ordered", "partial", "received", "cancelled"];
    if (!allowedStatus.includes(status)) throw new Error("Invalid purchase order status");

    let totalAmount = 0;
    for (const item of data.items) {
      const qty = Number(item.qty || 0);
      const unitCost = Number(item.unit_cost || 0);
      if (!item.product_id) throw new Error("Product is required in all items");
      if (!(qty > 0)) throw new Error("Item quantity must be greater than zero");
      if (unitCost < 0) throw new Error("Unit cost cannot be negative");
      totalAmount += Number((qty * unitCost).toFixed(2));
    }

    const info = statements.insertPurchaseOrder.run(
      poNumber || null,
      data.supplier_id || null,
      data.order_date,
      data.expected_date || null,
      status,
      totalAmount,
      data.notes || ""
    );

    const purchaseOrderId = info.lastInsertRowid;
    for (const item of data.items) {
      const qty = Number(item.qty || 0);
      const unitCost = Number(item.unit_cost || 0);
      const lineTotal = Number((qty * unitCost).toFixed(2));
      statements.insertPurchaseOrderItem.run(
        purchaseOrderId,
        item.product_id,
        item.description || "",
        qty,
        unitCost,
        lineTotal
      );
    }

    return { id: purchaseOrderId };
  })();
}

function updatePurchaseOrderWithItems(data) {
  return db.transaction(() => {
    if (!data?.id) throw new Error("Purchase order ID is required");
    if (!data?.order_date) throw new Error("Order date is required");
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("Purchase order must contain at least one item");
    }

    const status = String(data.status || "draft").trim().toLowerCase();
    const allowedStatus = ["draft", "ordered", "partial", "received", "cancelled"];
    if (!allowedStatus.includes(status)) throw new Error("Invalid purchase order status");

    let totalAmount = 0;
    for (const item of data.items) {
      const qty = Number(item.qty || 0);
      const unitCost = Number(item.unit_cost || 0);
      if (!item.product_id) throw new Error("Product is required in all items");
      if (!(qty > 0)) throw new Error("Item quantity must be greater than zero");
      if (unitCost < 0) throw new Error("Unit cost cannot be negative");
      totalAmount += Number((qty * unitCost).toFixed(2));
    }

    statements.updatePurchaseOrder.run(
      String(data.po_number || "").trim() || null,
      data.supplier_id || null,
      data.order_date,
      data.expected_date || null,
      status,
      totalAmount,
      data.notes || "",
      data.id
    );

    statements.deletePurchaseOrderItems.run(data.id);
    for (const item of data.items) {
      const qty = Number(item.qty || 0);
      const unitCost = Number(item.unit_cost || 0);
      const lineTotal = Number((qty * unitCost).toFixed(2));
      statements.insertPurchaseOrderItem.run(
        data.id,
        item.product_id,
        item.description || "",
        qty,
        unitCost,
        lineTotal
      );
    }

    return { id: data.id };
  })();
}

function getPurchaseOrdersWithItems() {
  const rows = statements.getAllPurchaseOrders.all();
  return rows.map((po) => ({
    ...po,
    items: statements.getPurchaseOrderItems.all(po.id),
  }));
}

function createStockMovement(data) {
  return db.transaction(() => {
    const productId = Number(data.product_id || 0);
    const movementType = String(data.movement_type || "").trim().toLowerCase();
    const quantity = Number(data.quantity || 0);

    if (!productId) throw new Error("Product is required");
    if (!["in", "out", "adjustment"].includes(movementType)) {
      throw new Error("Invalid stock movement type");
    }
    if (!Number.isFinite(quantity) || quantity === 0) {
      throw new Error("Quantity must be a non-zero number");
    }
    if ((movementType === "in" || movementType === "out") && quantity < 0) {
      throw new Error("Use positive quantity for IN/OUT movements");
    }

    if (movementType === "out") {
      const stockRow = statements.getProductStockBalance.get(productId);
      const available = Number(stockRow?.stock || 0);
      if (available < quantity) {
        throw new Error("Insufficient stock for outbound movement");
      }
    }

    const info = statements.insertStockMovement.run(
      productId,
      movementType,
      quantity,
      data.reference_type || null,
      data.reference_id || null,
      data.notes || ""
    );
    return { id: info.lastInsertRowid };
  })();
}

function listWarehouses() {
  const rows = db
    .prepare("SELECT * FROM warehouses WHERE is_active = 1 ORDER BY is_primary DESC, name ASC")
    .all();
  return attachCustomFieldsToRows("warehouses", rows);
}

function upsertWarehouseStock({
  productId,
  warehouseId,
  deltaQty,
  unitCost = 0,
}) {
  const row = db
    .prepare(
      `SELECT id, on_hand, avg_cost
       FROM warehouse_stock
       WHERE product_id = ? AND warehouse_id = ?`
    )
    .get(productId, warehouseId);

  if (!row) {
    const openingQty = Number(deltaQty || 0);
    const cost = openingQty > 0 ? Number(unitCost || 0) : 0;
    db.prepare(
      `INSERT INTO warehouse_stock
       (product_id, warehouse_id, on_hand, reserved, available, avg_cost, updated_at)
       VALUES (?, ?, ?, 0, ?, ?, CURRENT_TIMESTAMP)`
    ).run(productId, warehouseId, openingQty, openingQty, cost);
    return;
  }

  const current = Number(row.on_hand || 0);
  const next = current + Number(deltaQty || 0);
  if (next < 0) throw new Error("Insufficient warehouse stock");

  // Weighted moving average when stock increases with a costed receipt
  let avgCost = Number(row.avg_cost || 0);
  if (deltaQty > 0 && unitCost > 0) {
    const totalValue = current * avgCost + Number(deltaQty) * Number(unitCost);
    avgCost = next > 0 ? totalValue / next : avgCost;
  }

  db.prepare(
    `UPDATE warehouse_stock
     SET on_hand = ?, available = ?, avg_cost = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(next, next, avgCost, row.id);
}

function upsertLotStock({
  productId,
  warehouseId,
  lotNumber,
  lotId,
  deltaQty,
  expiryDate,
  manufactureDate,
  receivedDate,
}) {
  let lot = null;

  if (lotId) {
    lot = db
      .prepare("SELECT * FROM inventory_lots WHERE id = ?")
      .get(Number(lotId));
  } else if (lotNumber) {
    lot = db
      .prepare(
        `SELECT * FROM inventory_lots
         WHERE product_id = ? AND warehouse_id = ? AND lot_number = ?`
      )
      .get(productId, warehouseId, String(lotNumber).trim());
  }

  if (!lot) {
    if (!(deltaQty > 0)) {
      throw new Error("Lot not found for outbound/negative movement");
    }

    const info = db
      .prepare(
        `INSERT INTO inventory_lots
         (product_id, warehouse_id, lot_number, expiry_date, manufacture_date, received_date, quantity_available, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .run(
        productId,
        warehouseId,
        String(lotNumber || `LOT-${Date.now()}`).trim(),
        expiryDate || null,
        manufactureDate || null,
        receivedDate || null,
        Number(deltaQty)
      );
    return Number(info.lastInsertRowid);
  }

  const nextQty = Number(lot.quantity_available || 0) + Number(deltaQty || 0);
  if (nextQty < 0) throw new Error("Insufficient lot quantity");

  db.prepare(
    `UPDATE inventory_lots
     SET quantity_available = ?,
         expiry_date = COALESCE(?, expiry_date),
         manufacture_date = COALESCE(?, manufacture_date),
         received_date = COALESCE(?, received_date),
         status = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    nextQty,
    expiryDate || null,
    manufactureDate || null,
    receivedDate || null,
    nextQty > 0 ? "active" : "exhausted",
    lot.id
  );

  return Number(lot.id);
}

function createInventoryTransaction(data) {
  return db.transaction(() => {
    const productId = Number(data.product_id || 0);
    const warehouseId = Number(data.warehouse_id || 0);
    const txnType = String(data.txn_type || "").trim().toLowerCase();
    const quantity = Number(data.quantity || 0);
    const unitCost = Number(data.unit_cost || 0);

    if (!productId) throw new Error("Product is required");
    if (!warehouseId) throw new Error("Warehouse is required");
    if (!["in", "out", "adjustment"].includes(txnType)) {
      throw new Error("Invalid transaction type");
    }
    if (!Number.isFinite(quantity) || quantity === 0) {
      throw new Error("Quantity must be a non-zero number");
    }
    if ((txnType === "in" || txnType === "out") && quantity < 0) {
      throw new Error("Use positive quantity for IN/OUT transaction");
    }

    const stock = db
      .prepare(
        `SELECT COALESCE(on_hand, 0) AS on_hand
         FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ?`
      )
      .get(productId, warehouseId);
    const currentOnHand = Number(stock?.on_hand || 0);

    let delta = quantity;
    if (txnType === "out") delta = -Math.abs(quantity);

    if (txnType === "out" && currentOnHand < Math.abs(quantity)) {
      throw new Error("Insufficient stock in selected warehouse");
    }

    let lotId = data.lot_id ? Number(data.lot_id) : null;
    if (data.lot_number || lotId) {
      lotId = upsertLotStock({
        productId,
        warehouseId,
        lotNumber: data.lot_number,
        lotId,
        deltaQty: delta,
        expiryDate: data.expiry_date,
        manufactureDate: data.manufacture_date,
        receivedDate: data.received_date,
      });
    }

    upsertWarehouseStock({
      productId,
      warehouseId,
      deltaQty: delta,
      unitCost,
    });

    const info = db
      .prepare(
        `INSERT INTO stock_transactions
         (product_id, warehouse_id, lot_id, txn_type, quantity, unit_cost, reference_type, reference_id, notes, txn_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)`
      )
      .run(
        productId,
        warehouseId,
        lotId,
        txnType,
        quantity,
        unitCost,
        data.reference_type || "manual",
        data.reference_id || null,
        data.notes || "",
        data.txn_date || null
      );

    return { id: info.lastInsertRowid };
  })();
}

function transferInventory(data) {
  return db.transaction(() => {
    const productId = Number(data.product_id || 0);
    const fromWarehouseId = Number(data.from_warehouse_id || 0);
    const toWarehouseId = Number(data.to_warehouse_id || 0);
    const quantity = Number(data.quantity || 0);

    if (!productId) throw new Error("Product is required");
    if (!fromWarehouseId || !toWarehouseId) throw new Error("Both warehouses are required");
    if (fromWarehouseId === toWarehouseId) throw new Error("Warehouses must be different");
    if (!(quantity > 0)) throw new Error("Transfer quantity must be greater than zero");

    const sourceStock = db
      .prepare(
        `SELECT COALESCE(on_hand, 0) AS on_hand
         FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ?`
      )
      .get(productId, fromWarehouseId);
    const current = Number(sourceStock?.on_hand || 0);
    if (current < quantity) throw new Error("Insufficient stock in source warehouse");

    let outgoingLotId = data.lot_id ? Number(data.lot_id) : null;
    if (outgoingLotId) {
      const lot = db.prepare("SELECT * FROM inventory_lots WHERE id = ?").get(outgoingLotId);
      if (!lot) throw new Error("Lot not found");
      if (Number(lot.quantity_available || 0) < quantity) {
        throw new Error("Insufficient lot quantity for transfer");
      }

      upsertLotStock({
        productId,
        warehouseId: fromWarehouseId,
        lotId: outgoingLotId,
        deltaQty: -quantity,
      });

      upsertLotStock({
        productId,
        warehouseId: toWarehouseId,
        lotNumber: lot.lot_number,
        deltaQty: quantity,
        expiryDate: lot.expiry_date,
        manufactureDate: lot.manufacture_date,
        receivedDate: new Date().toISOString().slice(0, 10),
      });
    }

    upsertWarehouseStock({ productId, warehouseId: fromWarehouseId, deltaQty: -quantity });
    upsertWarehouseStock({
      productId,
      warehouseId: toWarehouseId,
      deltaQty: quantity,
      unitCost: Number(data.unit_cost || 0),
    });

    const note = data.notes || "";
    db.prepare(
      `INSERT INTO stock_transactions
       (product_id, warehouse_id, lot_id, txn_type, quantity, unit_cost, reference_type, reference_id, notes, txn_date, created_at)
       VALUES (?, ?, ?, 'out', ?, ?, 'transfer', NULL, ?, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)`
    ).run(
      productId,
      fromWarehouseId,
      outgoingLotId,
      quantity,
      Number(data.unit_cost || 0),
      `Transfer to warehouse #${toWarehouseId}. ${note}`.trim(),
      data.txn_date || null
    );

    db.prepare(
      `INSERT INTO stock_transactions
       (product_id, warehouse_id, lot_id, txn_type, quantity, unit_cost, reference_type, reference_id, notes, txn_date, created_at)
       VALUES (?, ?, NULL, 'in', ?, ?, 'transfer', NULL, ?, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)`
    ).run(
      productId,
      toWarehouseId,
      quantity,
      Number(data.unit_cost || 0),
      `Transfer from warehouse #${fromWarehouseId}. ${note}`.trim(),
      data.txn_date || null
    );

    return { success: true };
  })();
}

function upsertReorderLevel(data) {
  const productId = Number(data.product_id || 0);
  const warehouseId = Number(data.warehouse_id || 0);
  if (!productId || !warehouseId) {
    throw new Error("Product and warehouse are required");
  }

  const existing = db
    .prepare("SELECT id FROM product_reorder_levels WHERE product_id = ? AND warehouse_id = ?")
    .get(productId, warehouseId);

  const values = [
    productId,
    warehouseId,
    Number(data.reorder_point || 0),
    Number(data.safety_stock || 0),
    Number(data.preferred_stock || 0),
    Number(data.lead_time_days || 0),
  ];

  if (existing) {
    db.prepare(
      `UPDATE product_reorder_levels
       SET reorder_point = ?, safety_stock = ?, preferred_stock = ?, lead_time_days = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(values[2], values[3], values[4], values[5], existing.id);
    return { id: existing.id };
  }

  const info = db
    .prepare(
      `INSERT INTO product_reorder_levels
       (product_id, warehouse_id, reorder_point, safety_stock, preferred_stock, lead_time_days, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    )
    .run(...values);
  return { id: info.lastInsertRowid };
}

function getWarehouseStockSummary(filters = {}) {
  const clauses = [];
  const params = [];
  if (filters.product_id) {
    clauses.push("ws.product_id = ?");
    params.push(Number(filters.product_id));
  }
  if (filters.warehouse_id) {
    clauses.push("ws.warehouse_id = ?");
    params.push(Number(filters.warehouse_id));
  }
  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Math.max(1, Math.min(1000, Number(filters.limit || 300)));
  return db
    .prepare(
      `SELECT
        p.id AS product_id,
        p.sku,
        p.name AS product_name,
        p.unit,
        w.id AS warehouse_id,
        w.name AS warehouse_name,
        COALESCE(ws.on_hand, 0) AS on_hand,
        COALESCE(ws.available, 0) AS available,
        COALESCE(ws.avg_cost, 0) AS avg_cost,
        COALESCE(pr.reorder_point, 0) AS reorder_point,
        COALESCE(pr.safety_stock, 0) AS safety_stock,
        CASE WHEN COALESCE(ws.on_hand, 0) <= COALESCE(pr.reorder_point, 0) AND COALESCE(pr.reorder_point, 0) > 0 THEN 1 ELSE 0 END AS is_below_reorder
      FROM warehouse_stock ws
      JOIN products p ON p.id = ws.product_id
      JOIN warehouses w ON w.id = ws.warehouse_id AND w.is_active = 1
      LEFT JOIN product_reorder_levels pr ON pr.product_id = ws.product_id AND pr.warehouse_id = ws.warehouse_id
      ${whereSql}
      ORDER BY ws.updated_at DESC, ws.id DESC
      LIMIT ?`
    )
    .all(...params, limit);
}

function getLots(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.product_id) {
    clauses.push("l.product_id = ?");
    params.push(Number(filters.product_id));
  }
  if (filters.warehouse_id) {
    clauses.push("l.warehouse_id = ?");
    params.push(Number(filters.warehouse_id));
  }
  if (filters.only_active) {
    clauses.push("l.quantity_available > 0");
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Math.max(1, Math.min(2000, Number(filters.limit || 500)));

  return db
    .prepare(
      `SELECT
        l.*,
        p.name AS product_name,
        p.sku AS product_sku,
        w.name AS warehouse_name
      FROM inventory_lots l
      JOIN products p ON p.id = l.product_id
      JOIN warehouses w ON w.id = l.warehouse_id
      ${whereSql}
      ORDER BY l.updated_at DESC, l.id DESC
      LIMIT ?`
    )
    .all(...params, limit);
}

function getReorderAlerts(filters = {}) {
  const limit = Math.max(1, Math.min(2000, Number(filters.limit || 500)));
  const lowStock = db
    .prepare(
      `SELECT
        p.id AS product_id,
        p.sku,
        p.name AS product_name,
        w.id AS warehouse_id,
        w.name AS warehouse_name,
        COALESCE(ws.on_hand, 0) AS on_hand,
        COALESCE(pr.reorder_point, 0) AS reorder_point,
        COALESCE(pr.preferred_stock, 0) AS preferred_stock
      FROM warehouse_stock ws
      JOIN products p ON p.id = ws.product_id
      JOIN warehouses w ON w.id = ws.warehouse_id
      JOIN product_reorder_levels pr ON pr.product_id = ws.product_id AND pr.warehouse_id = ws.warehouse_id
      WHERE COALESCE(pr.reorder_point, 0) > 0
        AND COALESCE(ws.on_hand, 0) <= COALESCE(pr.reorder_point, 0)
      ORDER BY (COALESCE(pr.reorder_point, 0) - COALESCE(ws.on_hand, 0)) DESC
      LIMIT ?`
    )
    .all(limit);

  const expiringLots = db
    .prepare(
      `SELECT
        l.id,
        l.lot_number,
        l.expiry_date,
        l.quantity_available,
        p.name AS product_name,
        p.sku,
        w.name AS warehouse_name
      FROM inventory_lots l
      JOIN products p ON p.id = l.product_id
      JOIN warehouses w ON w.id = l.warehouse_id
      WHERE l.quantity_available > 0
        AND l.expiry_date IS NOT NULL
        AND date(l.expiry_date) <= date('now', '+45 day')
      ORDER BY date(l.expiry_date) ASC
      LIMIT ?`
    )
    .all(limit);

  return { lowStock, expiringLots };
}

function getStockTransactions(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.product_id) {
    clauses.push("t.product_id = ?");
    params.push(Number(filters.product_id));
  }
  if (filters.warehouse_id) {
    clauses.push("t.warehouse_id = ?");
    params.push(Number(filters.warehouse_id));
  }
  if (filters.from_date) {
    clauses.push("t.txn_date >= ?");
    params.push(`${filters.from_date} 00:00:00`);
  }
  if (filters.to_date) {
    clauses.push("t.txn_date <= ?");
    params.push(`${filters.to_date} 23:59:59`);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Math.max(1, Math.min(5000, Number(filters.limit || 1000)));

  return db
    .prepare(
      `SELECT
        t.*,
        p.name AS product_name,
        p.sku AS product_sku,
        w.name AS warehouse_name,
        l.lot_number,
        l.expiry_date
      FROM stock_transactions t
      JOIN products p ON p.id = t.product_id
      JOIN warehouses w ON w.id = t.warehouse_id
      LEFT JOIN inventory_lots l ON l.id = t.lot_id
      ${whereSql}
      ORDER BY t.txn_date DESC, t.id DESC
      LIMIT ?`
    )
    .all(...params, limit);
}

function getInventoryValuationReport(filters = {}) {
  const clauses = [];
  const params = [];
  if (filters.product_id) {
    clauses.push("ws.product_id = ?");
    params.push(Number(filters.product_id));
  }
  if (filters.warehouse_id) {
    clauses.push("ws.warehouse_id = ?");
    params.push(Number(filters.warehouse_id));
  }
  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Math.max(1, Math.min(5000, Number(filters.limit || 1200)));
  return db
    .prepare(
      `SELECT
        p.id AS product_id,
        p.sku,
        p.name AS product_name,
        w.id AS warehouse_id,
        w.name AS warehouse_name,
        COALESCE(ws.on_hand, 0) AS on_hand,
        COALESCE(ws.avg_cost, 0) AS avg_cost,
        ROUND(COALESCE(ws.on_hand, 0) * COALESCE(ws.avg_cost, 0), 2) AS stock_value
      FROM warehouse_stock ws
      JOIN products p ON p.id = ws.product_id
      JOIN warehouses w ON w.id = ws.warehouse_id
      ${whereSql}
      ORDER BY stock_value DESC
      LIMIT ?`
    )
    .all(...params, limit);
}

function getExpiryReport(filters = {}) {
  const limit = Math.max(1, Math.min(5000, Number(filters.limit || 1200)));
  return db
    .prepare(
      `SELECT
        l.id,
        l.lot_number,
        l.expiry_date,
        l.quantity_available,
        p.sku,
        p.name AS product_name,
        w.name AS warehouse_name,
        CAST(julianday(date(l.expiry_date)) - julianday(date('now')) AS INTEGER) AS days_to_expiry
      FROM inventory_lots l
      JOIN products p ON p.id = l.product_id
      JOIN warehouses w ON w.id = l.warehouse_id
      WHERE l.expiry_date IS NOT NULL AND l.quantity_available > 0
      ORDER BY date(l.expiry_date) ASC
      LIMIT ?`
    )
    .all(limit);
}

function queryCustomers(options = {}) {
  const sort = normalizeSort(
    options,
    ["id", "name", "phone", "email", "created_at", "updated_at"],
    "id"
  );
  const result = paginateQuery({
    baseFromSql: "SELECT * FROM customers",
    countFromSql: "FROM customers",
    search: options.search,
    searchColumns: ["name", "phone", "email", "address"],
    sort,
    page: options.page,
    pageSize: options.pageSize,
  });
  result.rows = attachCustomFieldsToRows("customers", result.rows || []);
  return result;
}

function queryProducts(options = {}) {
  const sort = normalizeSort(
    options,
    ["id", "sku", "name", "price", "category", "created_at", "updated_at"],
    "id"
  );
  const result = paginateQuery({
    baseFromSql: "SELECT * FROM products",
    countFromSql: "FROM products",
    search: options.search,
    searchColumns: ["sku", "name", "description", "category", "unit"],
    sort,
    page: options.page,
    pageSize: options.pageSize,
  });
  result.rows = attachCustomFieldsToRows("products", result.rows || []);
  return result;
}

function querySuppliers(options = {}) {
  const sort = normalizeSort(
    options,
    ["id", "name", "contact_person", "phone", "email", "status", "updated_at"],
    "id"
  );
  const result = paginateQuery({
    baseFromSql: "SELECT * FROM suppliers",
    countFromSql: "FROM suppliers",
    search: options.search,
    searchColumns: ["name", "contact_person", "phone", "email", "tax_number", "address"],
    sort,
    page: options.page,
    pageSize: options.pageSize,
  });
  result.rows = attachCustomFieldsToRows("suppliers", result.rows || []);
  return result;
}

function queryWarehouses(options = {}) {
  const sort = normalizeSort(
    options,
    ["id", "code", "name", "city", "state", "country", "updated_at"],
    "name"
  );
  const result = paginateQuery({
    baseFromSql: "SELECT * FROM warehouses",
    countFromSql: "FROM warehouses",
    search: options.search,
    searchColumns: ["code", "name", "address", "city", "state", "country"],
    sort,
    page: options.page,
    pageSize: options.pageSize,
  });
  result.rows = attachCustomFieldsToRows("warehouses", result.rows || []);
  return result;
}

function queryPurchaseOrders(options = {}) {
  const { page, pageSize } = normalizePagination(options);
  const sort = normalizeSort(
    options,
    ["id", "po_number", "order_date", "expected_date", "status", "total_amount", "supplier_name"],
    "id"
  );
  const { where, params } = buildSearchWhere(options.search, [
    "po.po_number",
    "s.name",
    "po.status",
    "po.notes",
  ]);
  const total = db
    .prepare(
      `SELECT COUNT(*) as total
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id${where}`
    )
    .get(...params).total;

  const rows = db
    .prepare(
      `SELECT po.*, s.name AS supplier_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id${where}
       ORDER BY ${sort.key === "supplier_name" ? "supplier_name" : `po.${sort.key}`} ${sort.dir}
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize)
    .map((po) => ({
      ...po,
      items: statements.getPurchaseOrderItems.all(po.id),
    }));

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function queryInvoices(options = {}) {
  const { page, pageSize } = normalizePagination(options);
  const sort = normalizeSort(
    options,
    ["id", "invoice_number", "invoice_date", "status", "total", "paid_amount", "balance_due", "customer_name"],
    "invoice_date"
  );
  const clauses = [];
  const params = [];
  if (options.status) {
    clauses.push("i.status = ?");
    params.push(String(options.status));
  }
  if (options.search) {
    const like = `%${String(options.search).trim()}%`;
    clauses.push("(i.invoice_number LIKE ? OR c.name LIKE ? OR i.status LIKE ? OR i.notes LIKE ?)");
    params.push(like, like, like, like);
  }
  const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  const total = db
    .prepare(
      `SELECT COUNT(*) as total
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id${where}`
    )
    .get(...params).total;

  const rows = db
    .prepare(
      `SELECT i.*, c.name as customer_name
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id${where}
       ORDER BY ${sort.key === "customer_name" ? "customer_name" : `i.${sort.key}`} ${sort.dir}
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize);

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function queryNotes(options = {}) {
  const sort = normalizeSort(
    options,
    ["id", "title", "is_pinned", "created_at", "updated_at"],
    "updated_at"
  );
  return paginateQuery({
    baseFromSql: "SELECT * FROM notes",
    countFromSql: "FROM notes",
    search: options.search,
    searchColumns: ["title", "content", "tags"],
    sort,
    page: options.page,
    pageSize: options.pageSize,
  });
}

function queryTaxRates(options = {}) {
  const sort = normalizeSort(options, ["id", "name", "rate", "is_active", "is_default", "updated_at"], "name");
  return paginateQuery({
    baseFromSql: "SELECT * FROM tax_rates",
    countFromSql: "FROM tax_rates",
    search: options.search,
    searchColumns: ["name"],
    sort,
    page: options.page,
    pageSize: options.pageSize,
  });
}

function listProductOptions(options = {}) {
  const params = [];
  let whereSql = "";
  const search = String(options.search || "").trim();
  if (search) {
    whereSql = "WHERE p.name LIKE ? OR p.sku LIKE ?";
    const like = `%${search}%`;
    params.push(like, like);
  }
  const limit = Math.max(1, Math.min(5000, Number(options.limit || 1000)));
  return db
    .prepare(
      `SELECT p.id, p.name, p.sku
       FROM products p
       ${whereSql}
       ORDER BY p.name ASC
       LIMIT ?`
    )
    .all(...params, limit);
}

function listWarehouseOptions(options = {}) {
  const params = [];
  let whereSql = "WHERE w.is_active = 1";
  const search = String(options.search || "").trim();
  if (search) {
    whereSql += " AND (w.name LIKE ? OR w.code LIKE ?)";
    const like = `%${search}%`;
    params.push(like, like);
  }
  const limit = Math.max(1, Math.min(2000, Number(options.limit || 500)));
  return db
    .prepare(
      `SELECT w.id, w.name, w.code
       FROM warehouses w
       ${whereSql}
       ORDER BY w.is_primary DESC, w.name ASC
       LIMIT ?`
    )
    .all(...params, limit);
}

function queryStockTransactions(options = {}) {
  const { page, pageSize } = normalizePagination(options);
  const sort = normalizeSort(
    options,
    ["id", "txn_date", "txn_type", "quantity", "product_name", "warehouse_name"],
    "txn_date"
  );

  const clauses = [];
  const params = [];
  if (options.product_id) {
    clauses.push("t.product_id = ?");
    params.push(Number(options.product_id));
  }
  if (options.warehouse_id) {
    clauses.push("t.warehouse_id = ?");
    params.push(Number(options.warehouse_id));
  }
  if (options.from_date) {
    clauses.push("t.txn_date >= ?");
    params.push(`${options.from_date} 00:00:00`);
  }
  if (options.to_date) {
    clauses.push("t.txn_date <= ?");
    params.push(`${options.to_date} 23:59:59`);
  }
  if (options.search) {
    const like = `%${String(options.search).trim()}%`;
    clauses.push("(p.name LIKE ? OR p.sku LIKE ? OR w.name LIKE ? OR t.notes LIKE ?)");
    params.push(like, like, like, like);
  }

  const whereSql = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  const total = db
    .prepare(
      `SELECT COUNT(*) as total
       FROM stock_transactions t
       JOIN products p ON p.id = t.product_id
       JOIN warehouses w ON w.id = t.warehouse_id${whereSql}`
    )
    .get(...params).total;

  const sortExpr =
    sort.key === "product_name"
      ? "p.name"
      : sort.key === "warehouse_name"
      ? "w.name"
      : `t.${sort.key}`;

  const rows = db
    .prepare(
      `SELECT
        t.*,
        p.name AS product_name,
        p.sku AS product_sku,
        w.name AS warehouse_name,
        l.lot_number,
        l.expiry_date
      FROM stock_transactions t
      JOIN products p ON p.id = t.product_id
      JOIN warehouses w ON w.id = t.warehouse_id
      LEFT JOIN inventory_lots l ON l.id = t.lot_id${whereSql}
      ORDER BY ${sortExpr} ${sort.dir}
      LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize);

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function checkSkuExists(sku, excludeId = null) {
  const result = statements.checkSkuExists.get(sku, excludeId || 0);
  return !!result;
}

function getNextSkuSequence(baseCode) {
  const base = String(baseCode || "").trim();
  if (!base) return 1;

  const rows = db
    .prepare("SELECT sku FROM products WHERE sku LIKE ?")
    .all(`${base}-%`);

  let maxSequence = 0;
  for (const row of rows) {
    const match = String(row?.sku || "").match(/-(\d+)$/);
    if (!match) continue;
    const sequence = Number(match[1]);
    if (Number.isFinite(sequence) && sequence > maxSequence) {
      maxSequence = sequence;
    }
  }
  return maxSequence + 1;
}

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function deriveInvoiceStatus(total, paidAmount) {
  const safeTotal = toMoney(Math.max(0, Number(total || 0)));
  const safePaid = toMoney(Math.max(0, Number(paidAmount || 0)));
  if (safePaid <= 0) return "unpaid";
  if (safePaid >= safeTotal) return "paid";
  return "partially_paid";
}

function syncInvoicePaymentState(invoiceId, options = {}) {
  const id = Number(invoiceId || 0);
  if (!(id > 0)) throw new Error("Invoice ID is required");

  const invoice = db
    .prepare("SELECT id, total, status FROM invoices WHERE id = ?")
    .get(id);
  if (!invoice) throw new Error("Invoice not found");

  const paidAmount = toMoney(
    statements.getInvoicePaymentTotal.get(id)?.paid_amount || 0
  );
  const total = toMoney(invoice.total || 0);
  if (paidAmount > total) {
    throw new Error("Invoice paid amount cannot exceed invoice total");
  }

  const balanceDue = toMoney(Math.max(0, total - paidAmount));
  const forceCancelled = options.forceStatus === "cancelled";
  const status = forceCancelled
    ? "cancelled"
    : deriveInvoiceStatus(total, paidAmount);

  statements.updateInvoicePaymentSummary.run(paidAmount, balanceDue, status, id);
  return { paid_amount: paidAmount, balance_due: balanceDue, status };
}

function calculateInvoiceTotals(inv, items, settings) {
  const enableTax = Number(settings?.enable_tax || 0) === 1;
  const taxScheme = String(settings?.tax_scheme || "simple")
    .trim()
    .toLowerCase();
  const validTaxScheme = ["simple", "gst_india"].includes(taxScheme)
    ? taxScheme
    : "simple";
  const isGstIndia = validTaxScheme === "gst_india";
  const taxName = String(inv.tax_name || settings?.default_tax_name || "Tax").trim() || "Tax";
  const invoiceTaxRateRaw = Number(
    inv.tax_rate != null ? inv.tax_rate : settings?.default_tax_rate || 0
  );
  const invoiceTaxRate = Number.isFinite(invoiceTaxRateRaw)
    ? Math.max(0, invoiceTaxRateRaw)
    : 0;
  const taxMode = String(inv.tax_mode || settings?.default_tax_mode || "exclusive")
    .trim()
    .toLowerCase();
  const validTaxMode = ["exclusive", "inclusive", "none"].includes(taxMode)
    ? taxMode
    : "exclusive";
  const taxTypeInput = String(
    inv.tax_type || settings?.default_gst_tax_type || "intra"
  )
    .trim()
    .toLowerCase();
  const validTaxType = isGstIndia
    ? ["intra", "inter"].includes(taxTypeInput)
      ? taxTypeInput
      : "intra"
    : "simple";
  const cgstLabel = String(settings?.cgst_label || "CGST").trim() || "CGST";
  const sgstLabel = String(settings?.sgst_label || "SGST").trim() || "SGST";
  const igstLabel = String(settings?.igst_label || "IGST").trim() || "IGST";
  const taxRows = statements.getAllTaxRates.all();
  const taxById = new Map(taxRows.map((row) => [Number(row.id), row]));
  const productRows = statements.getAllProducts.all();
  const productById = new Map(productRows.map((row) => [Number(row.id), row]));

  let subtotal = 0;
  let taxTotal = 0;
  let gross = 0;

  const normalizedItems = (Array.isArray(items) ? items : []).map((item) => {
    const qty = Number(item.qty || 1);
    const unitPrice = Number(item.unit_price || 0);
    if (!(qty > 0)) throw new Error("Invoice item quantity must be greater than zero");
    if (unitPrice < 0) throw new Error("Invoice item price cannot be negative");

    const itemTaxId = Number(item.tax_id || 0);
    const selectedTax = itemTaxId > 0 ? taxById.get(itemTaxId) : null;
    const productTaxId = Number(productById.get(Number(item.product_id || 0))?.default_tax_id || 0);
    const productTax = productTaxId > 0 ? taxById.get(productTaxId) : null;
    const effectiveTax = selectedTax || productTax || null;
    const itemTaxRateRaw = Number(
      item.tax_rate != null
        ? item.tax_rate
        : effectiveTax?.rate != null
        ? effectiveTax.rate
        : invoiceTaxRate
    );
    const itemTaxName = String(item.tax_name || effectiveTax?.name || taxName).trim() || taxName;
    const itemTaxRate =
      enableTax && validTaxMode !== "none" && Number.isFinite(itemTaxRateRaw)
        ? Math.max(0, itemTaxRateRaw)
        : 0;

    const amount = toMoney(qty * unitPrice);
    let lineSubtotal = amount;
    let taxAmount = 0;
    let lineTotal = amount;

    if (itemTaxRate > 0 && validTaxMode === "exclusive") {
      taxAmount = toMoney((amount * itemTaxRate) / 100);
      lineSubtotal = amount;
      lineTotal = toMoney(lineSubtotal + taxAmount);
    } else if (itemTaxRate > 0 && validTaxMode === "inclusive") {
      taxAmount = toMoney((amount * itemTaxRate) / (100 + itemTaxRate));
      lineSubtotal = toMoney(amount - taxAmount);
      lineTotal = amount;
    }

    subtotal = toMoney(subtotal + lineSubtotal);
    taxTotal = toMoney(taxTotal + taxAmount);
    gross = toMoney(gross + lineTotal);

    const splitHalf = toMoney(taxAmount / 2);
    const splitOther = toMoney(Math.max(0, taxAmount - splitHalf));
    const cgstAmount = validTaxType === "intra" ? splitHalf : 0;
    const sgstAmount = validTaxType === "intra" ? splitOther : 0;
    const igstAmount = validTaxType === "inter" ? taxAmount : 0;

    return {
      product_id: item.product_id || null,
      description: String(item.description || "").trim(),
      qty,
      unit_price: toMoney(unitPrice),
      line_subtotal: lineSubtotal,
      tax_id: effectiveTax?.id || null,
      tax_name: itemTaxName,
      tax_rate: itemTaxRate,
      tax_amount: taxAmount,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      line_total: lineTotal,
    };
  });

  const discount = Math.max(0, Number(inv.discount || 0));
  const total = toMoney(Math.max(0, gross - discount));
  const intraCgst = validTaxType === "intra" ? toMoney(taxTotal / 2) : 0;
  const intraSgst = validTaxType === "intra" ? toMoney(Math.max(0, taxTotal - intraCgst)) : 0;
  const interIgst = validTaxType === "inter" ? toMoney(taxTotal) : 0;
  const taxBreakup = {
    scheme: validTaxScheme,
    tax_type: validTaxType,
    cgst_label: cgstLabel,
    sgst_label: sgstLabel,
    igst_label: igstLabel,
    cgst: intraCgst,
    sgst: intraSgst,
    igst: interIgst,
  };

  return {
    normalizedItems,
    subtotal,
    taxTotal: enableTax && validTaxMode !== "none" ? taxTotal : 0,
    taxName,
    taxRate: enableTax && validTaxMode !== "none" ? invoiceTaxRate : 0,
    taxMode: enableTax ? validTaxMode : "none",
    taxType: enableTax && validTaxMode !== "none" ? validTaxType : "simple",
    taxBreakup: enableTax && validTaxMode !== "none"
      ? taxBreakup
      : {
          scheme: validTaxScheme,
          tax_type: "simple",
          cgst_label: cgstLabel,
          sgst_label: sgstLabel,
          igst_label: igstLabel,
          cgst: 0,
          sgst: 0,
          igst: 0,
        },
    discount: toMoney(discount),
    total,
  };
}

/**
 * Create invoice with items (ATOMIC)
 * payload: { invoice: { invoice_number, customer_id, total, discount, invoice_date, due_date, status, notes }, items: [ { product_id, description, qty, unit_price, line_total } ] }
 */
function createInvoiceWithItems(data) {
  return db.transaction(() => {
    const inv = data.invoice || data; // allow old payload shape
    const settings = statements.getSettings.get() || {};
    const totals = calculateInvoiceTotals(inv, data.items, settings);
    const requestedStatus = String(inv.status || "").trim().toLowerCase();
    const isCancelled = requestedStatus === "cancelled";
    const paidAmount = 0;
    const balanceDue = totals.total;

    const info = statements.insertInvoice.run(
      inv.invoice_number || null,
      inv.customer_id || null,
      totals.subtotal,
      totals.taxTotal,
      totals.taxName,
      totals.taxRate,
      totals.taxMode,
      totals.taxType,
      JSON.stringify(totals.taxBreakup || {}),
      totals.total,
      paidAmount,
      balanceDue,
      totals.discount,
      inv.invoice_date,
      inv.due_date || null,
      isCancelled ? "cancelled" : "unpaid",
      inv.notes || ""
    );
    const invoiceId = info.lastInsertRowid;

    for (const item of totals.normalizedItems) {
      statements.insertInvoiceItem.run(
        invoiceId,
        item.product_id,
        item.description,
        item.qty,
        item.unit_price,
        item.line_subtotal,
        item.tax_id,
        item.tax_name,
        item.tax_rate,
        item.tax_amount,
        item.line_total
      );
    }

    return { id: invoiceId };
  })();
}

function createInvoicePayment(data) {
  return db.transaction(() => {
    const invoiceId = Number(data?.invoice_id || 0);
    if (!(invoiceId > 0)) throw new Error("Invoice ID is required");

    const invoice = db
      .prepare("SELECT id, total, status FROM invoices WHERE id = ?")
      .get(invoiceId);
    if (!invoice) throw new Error("Invoice not found");
    if (String(invoice.status || "").toLowerCase() === "cancelled") {
      throw new Error("Payment cannot be added for a cancelled invoice");
    }

    const amount = toMoney(Number(data?.amount || 0));
    if (!(amount > 0)) throw new Error("Payment amount must be greater than zero");

    const currentPaid = toMoney(
      statements.getInvoicePaymentTotal.get(invoiceId)?.paid_amount || 0
    );
    const pending = toMoney(Math.max(0, Number(invoice.total || 0) - currentPaid));
    if (amount > pending) {
      throw new Error("Payment amount cannot exceed pending balance");
    }

    const paymentDate =
      String(data?.payment_date || "").trim() ||
      new Date().toISOString().slice(0, 10);

    const info = statements.insertInvoicePayment.run(
      invoiceId,
      amount,
      paymentDate,
      String(data?.payment_method || "").trim(),
      String(data?.reference_no || "").trim(),
      String(data?.notes || "").trim()
    );

    const state = syncInvoicePaymentState(invoiceId);
    return { id: info.lastInsertRowid, invoice_id: invoiceId, ...state };
  })();
}

function deleteInvoicePayment(paymentId) {
  return db.transaction(() => {
    const id = Number(paymentId || 0);
    if (!(id > 0)) throw new Error("Payment ID is required");

    const payment = statements.getInvoicePaymentById.get(id);
    if (!payment) throw new Error("Payment not found");

    statements.deleteInvoicePayment.run(id);
    const state = syncInvoicePaymentState(payment.invoice_id);
    return { invoice_id: payment.invoice_id, ...state };
  })();
}

// --- Public API ---
module.exports = {
  // Settings
  getSettings: () => statements.getSettings.get(),
  updateSettings: (data) =>
    statements.updateSettings.run(
      data.company_name,
      data.currency,
      data.auto_generate_sku,
      data.sku_prefix,
      data.language,
      data.enable_tax ? 1 : 0,
      data.default_tax_name || "Tax",
      Number(data.default_tax_rate || 0),
      data.default_tax_mode || "exclusive",
      data.tax_scheme || "simple",
      data.default_gst_tax_type || "intra",
      data.cgst_label || "CGST",
      data.sgst_label || "SGST",
      data.igst_label || "IGST",
      data.enable_lot_tracking ? 1 : 0,
      data.enable_batch_tracking ? 1 : 0,
      data.enable_expiry_tracking ? 1 : 0,
      data.enable_manufacture_date ? 1 : 0,
      data.invoice_prefix || "INV",
      data.invoice_terms || "",
      data.invoice_footer || "Thank you for your business!",
      data.invoice_show_company_address ? 1 : 0,
      data.invoice_show_company_phone ? 1 : 0,
      data.invoice_show_company_email ? 1 : 0,
      data.invoice_show_company_tax_id ? 1 : 0,
      data.invoice_show_due_date ? 1 : 0,
      data.invoice_show_notes ? 1 : 0,
      Number.isFinite(Number(data.invoice_decimal_places))
        ? Math.min(4, Math.max(0, Number(data.invoice_decimal_places)))
        : 2
    ),

  // Customers
  insertCustomer: (data) => {
    const info = statements.insertCustomer.run(
      data.name,
      data.phone,
      data.email,
      data.address || ""
    );
    return { id: info.lastInsertRowid };
  },
  updateCustomer: (data) =>
    statements.updateCustomer.run(
      data.name,
      data.phone,
      data.email,
      data.address || "",
      data.id
    ),
  deleteCustomer: (id) => statements.deleteCustomer.run(id),
  getCustomersWithCustomFields,

  // Tax rates
  getTaxRates: () => statements.getAllTaxRates.all(),
  queryTaxRates,
  insertTaxRate: (data) => {
    const name = String(data?.name || "").trim();
    const rate = Number(data?.rate || 0);
    if (!name) throw new Error("Tax name is required");
    if (!Number.isFinite(rate) || rate < 0) throw new Error("Tax rate must be 0 or greater");
    const isDefault = Number(data?.is_default || 0) === 1 ? 1 : 0;
    if (isDefault) statements.clearTaxRateDefault.run();
    const info = statements.insertTaxRate.run(
      name,
      rate,
      Number(data?.is_active || 0) === 1 ? 1 : 0,
      isDefault
    );
    return { id: info.lastInsertRowid };
  },
  updateTaxRate: (data) => {
    const id = Number(data?.id || 0);
    if (!(id > 0)) throw new Error("Tax ID is required");
    const name = String(data?.name || "").trim();
    const rate = Number(data?.rate || 0);
    if (!name) throw new Error("Tax name is required");
    if (!Number.isFinite(rate) || rate < 0) throw new Error("Tax rate must be 0 or greater");
    const isDefault = Number(data?.is_default || 0) === 1 ? 1 : 0;
    if (isDefault) statements.clearTaxRateDefault.run();
    return statements.updateTaxRate.run(
      name,
      rate,
      Number(data?.is_active || 0) === 1 ? 1 : 0,
      isDefault,
      id
    );
  },
  deleteTaxRate: (id) => {
    const taxId = Number(id || 0);
    if (!(taxId > 0)) throw new Error("Tax ID is required");
    const productUse = Number(statements.countTaxRateUsageInProducts.get(taxId)?.total || 0);
    const invoiceUse = Number(statements.countTaxRateUsageInInvoiceItems.get(taxId)?.total || 0);
    if (productUse > 0 || invoiceUse > 0) {
      throw new Error("Tax is in use. Remove from products/invoices before deleting.");
    }
    return statements.deleteTaxRate.run(taxId);
  },

  // Suppliers
  insertSupplier: (data) => {
    validateSupplierPayload(data);
    const info = statements.insertSupplier.run(
      String(data.name || "").trim(),
      String(data.contact_person || "").trim(),
      String(data.phone || "").trim(),
      String(data.email || "").trim(),
      String(data.address || "").trim(),
      String(data.tax_number || "").trim(),
      String(data.status || "active").trim() || "active"
    );
    return { id: info.lastInsertRowid };
  },
  updateSupplier: (data) => {
    if (!data?.id) throw new Error("Supplier ID is required");
    validateSupplierPayload(data);
    return statements.updateSupplier.run(
      String(data.name || "").trim(),
      String(data.contact_person || "").trim(),
      String(data.phone || "").trim(),
      String(data.email || "").trim(),
      String(data.address || "").trim(),
      String(data.tax_number || "").trim(),
      String(data.status || "active").trim() || "active",
      data.id
    );
  },
  deleteSupplier: (id) => statements.deleteSupplier.run(id),
  getSuppliers,

  // Products
  insertProduct: (data) => {
    const info = statements.insertProduct.run(
      data.sku,
      data.name,
      data.description || "",
      data.unit || "",
      data.price || 0,
      data.discount || 0,
      data.category || "",
      data.default_tax_id || null
    );
    return { id: info.lastInsertRowid };
  },
  updateProduct: (data) =>
    statements.updateProduct.run(
      data.sku,
      data.name,
      data.description || "",
      data.unit || "",
      data.price || 0,
      data.discount || 0,
      data.category || "",
      data.default_tax_id || null,
      data.id
    ),
  deleteProduct: (id) => statements.deleteProduct.run(id),
  getProductsWithCustomFields,
  createInvoiceWithItems,
  getInvoicesWithItems,

  // Invoices
  insertInvoice: (data) => {
    const settings = statements.getSettings.get() || {};
    const totals = calculateInvoiceTotals(data, data.items, settings);
    const requestedStatus = String(data.status || "").trim().toLowerCase();
    const info = statements.insertInvoice.run(
      data.invoice_number,
      data.customer_id,
      totals.subtotal,
      totals.taxTotal,
      totals.taxName,
      totals.taxRate,
      totals.taxMode,
      totals.taxType,
      JSON.stringify(totals.taxBreakup || {}),
      totals.total,
      0,
      totals.total,
      totals.discount,
      data.invoice_date,
      data.due_date || null,
      requestedStatus === "cancelled" ? "cancelled" : "unpaid",
      data.notes || ""
    );
    return { id: info.lastInsertRowid };
  },
  updateInvoice: (data) => {
    const settings = statements.getSettings.get() || {};
    const totals = calculateInvoiceTotals(data, data.items, settings);
    const requestedStatus = String(data.status || "").trim().toLowerCase();
    return db.transaction(() => {
      const result = statements.updateInvoice.run(
        data.invoice_number,
        data.customer_id,
        totals.subtotal,
        totals.taxTotal,
        totals.taxName,
        totals.taxRate,
        totals.taxMode,
        totals.taxType,
        JSON.stringify(totals.taxBreakup || {}),
        totals.total,
        totals.discount,
        data.invoice_date,
        data.due_date || null,
        requestedStatus === "cancelled" ? "cancelled" : "unpaid",
        data.notes || "",
        data.id
      );
      syncInvoicePaymentState(data.id, {
        forceStatus: requestedStatus === "cancelled" ? "cancelled" : undefined,
      });
      return result;
    })();
  },
  deleteInvoice: (id) => {
    db.transaction(() => {
      statements.deleteInvoiceItems.run(id);
      statements.deleteInvoice.run(id);
    })();
  },
  getAllInvoices: () => getInvoicesWithItems(),
  getInvoiceById,
  insertInvoiceItem: (data) =>
    statements.insertInvoiceItem.run(
      data.invoice_id,
      data.product_id || null,
      data.description || "",
      Number(data.qty || 1),
      Number(data.unit_price || 0),
      Number(data.line_subtotal || 0),
      data.tax_id || null,
      data.tax_name || "",
      Number(data.tax_rate || 0),
      Number(data.tax_amount || 0),
      Number(data.line_total || 0)
    ),
  getInvoiceItems: (invoiceId) => statements.getInvoiceItems.all(invoiceId),
  getInvoicePayments: (invoiceId) => statements.getInvoicePayments.all(invoiceId),
  createInvoicePayment,
  deleteInvoicePayment,

  // Purchase Orders
  createPurchaseOrderWithItems,
  updatePurchaseOrderWithItems,
  deletePurchaseOrder: (id) => {
    db.transaction(() => {
      statements.deletePurchaseOrderItems.run(id);
      statements.deletePurchaseOrder.run(id);
    })();
    return true;
  },
  getPurchaseOrdersWithItems,
  getPurchaseOrderById: (id) => {
    const po = statements.getPurchaseOrderById.get(id);
    if (!po) return null;
    po.items = statements.getPurchaseOrderItems.all(id);
    return po;
  },

  // Stock
  createStockMovement,
  getStockMovements: () => statements.getAllStockMovements.all(),
  getStockSummary: () => statements.getStockSummary.all(),

  // Inventory
  listWarehouses,
  listProductOptions,
  listWarehouseOptions,
  createWarehouse: (data) => {
    const name = String(data?.name || "").trim();
    if (!name) throw new Error("Warehouse name is required");
    if (data.is_primary) {
      db.prepare("UPDATE warehouses SET is_primary = 0").run();
    }
    const info = db
      .prepare(
        `INSERT INTO warehouses
         (code, name, address, city, state, country, is_active, is_primary, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .run(
        String(data.code || "").trim() || null,
        name,
        String(data.address || "").trim(),
        String(data.city || "").trim(),
        String(data.state || "").trim(),
        String(data.country || "").trim(),
        data.is_active === 0 ? 0 : 1,
        data.is_primary ? 1 : 0
      );
    return { id: info.lastInsertRowid };
  },
  updateWarehouse: (data) => {
    if (!data?.id) throw new Error("Warehouse ID is required");
    const name = String(data?.name || "").trim();
    if (!name) throw new Error("Warehouse name is required");
    if (data.is_primary) {
      db.prepare("UPDATE warehouses SET is_primary = 0 WHERE id != ?").run(Number(data.id));
    }
    return db
      .prepare(
        `UPDATE warehouses
         SET code = ?, name = ?, address = ?, city = ?, state = ?, country = ?,
             is_active = ?, is_primary = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .run(
        String(data.code || "").trim() || null,
        name,
        String(data.address || "").trim(),
        String(data.city || "").trim(),
        String(data.state || "").trim(),
        String(data.country || "").trim(),
        data.is_active === 0 ? 0 : 1,
        data.is_primary ? 1 : 0,
        Number(data.id)
      );
  },
  deleteWarehouse: (id) => {
    const existing = db.prepare("SELECT id, is_primary FROM warehouses WHERE id = ?").get(Number(id));
    if (!existing) return true;
    if (existing.is_primary) throw new Error("Primary warehouse cannot be deleted");
    db.prepare("DELETE FROM warehouses WHERE id = ?").run(Number(id));
    return true;
  },
  createInventoryTransaction,
  transferInventory,
  upsertReorderLevel,
  getWarehouseStockSummary,
  getLots,
  getReorderAlerts,
  getStockTransactions,
  getInventoryValuationReport,
  getExpiryReport,
  queryCustomers,
  queryProducts,
  querySuppliers,
  queryWarehouses,
  queryPurchaseOrders,
  queryInvoices,
  queryNotes,
  queryStockTransactions,

  // Notes
  insertNote: (data) => {
    const info = statements.insertNote.run(
      data.title,
      data.content || "",
      data.tags || "",
      data.color || "#ffffff",
      data.is_pinned || 0
    );
    return { id: info.lastInsertRowid };
  },
  updateNote: (data) =>
    statements.updateNote.run(
      data.title,
      data.content || "",
      data.tags || "",
      data.color || "#ffffff",
      data.is_pinned || 0,
      data.id
    ),
  deleteNote: (id) => statements.deleteNote.run(id),
  getAllNotes: () => statements.getAllNotes.all(),

  // Custom Fields
  insertCustomField: (data) => {
    const info = statements.insertCustomField.run(
      data.module,
      data.field_name,
      data.field_label,
      data.field_type,
      data.is_required || 0,
      data.display_in_grid || 0,
      data.display_in_filter || 0,
      data.is_sortable || 0,
      data.is_searchable || 0,
      data.options || "",
      data.default_value || "",
      data.field_order || 0
    );
    return { id: info.lastInsertRowid };
  },
  updateCustomField: (data) =>
    statements.updateCustomField.run(
      data.module,
      data.field_name,
      data.field_label,
      data.field_type,
      data.is_required || 0,
      data.display_in_grid || 0,
      data.display_in_filter || 0,
      data.is_sortable || 0,
      data.is_searchable || 0,
      data.options || "",
      data.default_value || "",
      data.field_order || 0,
      data.id
    ),
  deleteCustomField: (id) => statements.deleteCustomField.run(id),
  getAllCustomFields: (module) => {
    const all = statements.getAllCustomFields.all();
    return module ? all.filter((f) => f.module === module) : all;
  },
  getCustomFieldValues: (fieldId, recordId) =>
    statements.getCustomFieldValues.get(fieldId, recordId),
  saveCustomFieldValue: (data) =>
    statements.saveCustomFieldValue.run(
      data.custom_field_id,
      data.record_id,
      data.value
    ),

  // Company Profile
  getCompanyProfile: () => statements.getCompanyProfile.get(),
  updateCompanyProfile: (data) =>
    statements.updateCompanyProfile.run(
      data.name,
      data.logo || null,
      data.address || "",
      data.city || "",
      data.state || "",
      data.postal_code || "",
      data.country || "",
      data.phone || "",
      data.email || "",
      data.website || "",
      data.tax_id || "",
      data.currency || "INR",
      data.timezone || "Asia/Kolkata",
      data.date_format || "DD/MM/YYYY",
      data.time_format || "12h",
      data.legal_name || "",
      data.gstin || "",
      data.pan || "",
      data.state_code || "",
      data.business_registration_no || "",
      data.contact_person || "",
      data.bank_name || "",
      data.bank_account_number || "",
      data.bank_ifsc || "",
      data.bank_branch || ""
    ),

  // SKU validation
  checkSkuExists,
  getNextSkuSequence,

  // Close DB (optional)
  close: () => db.close(),
};
