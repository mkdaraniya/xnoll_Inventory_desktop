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
    INSERT INTO products (sku, name, description, unit, price, discount, category, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  updateProduct: db.prepare(`
    UPDATE products SET sku = ?, name = ?, description = ?, unit = ?, price = ?, discount = ?, category = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  deleteProduct: db.prepare("DELETE FROM products WHERE id = ?"),
  getAllProducts: db.prepare("SELECT * FROM products ORDER BY id DESC"),

  // Invoices
  insertInvoice: db.prepare(`
    INSERT INTO invoices (
      invoice_number, customer_id, subtotal, tax_total, tax_name, tax_rate, tax_mode,
      total, discount, invoice_date, due_date, status, notes, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  updateInvoice: db.prepare(`
    UPDATE invoices SET
      invoice_number = ?, customer_id = ?, subtotal = ?, tax_total = ?, tax_name = ?, tax_rate = ?, tax_mode = ?,
      total = ?, discount = ?, invoice_date = ?, due_date = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
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
    INSERT INTO invoice_items (invoice_id, product_id, description, qty, unit_price, line_subtotal, tax_rate, tax_amount, line_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  deleteInvoiceItems: db.prepare(
    "DELETE FROM invoice_items WHERE invoice_id = ?"
  ),
  getInvoiceItems: db.prepare(
    "SELECT * FROM invoice_items WHERE invoice_id = ?"
  ),

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
function getCustomersWithCustomFields() {
  const customers = statements.getAllCustomers.all();
  const customFields = getAllCustomFields("customers");

  if (customFields.length === 0) return customers;

  for (const customer of customers) {
    customer.custom_fields = {};
    for (const field of customFields) {
      const row = statements.getCustomFieldValues.get(field.id, customer.id);
      if (row) customer.custom_fields[field.name] = row.value;
    }
  }
  return customers;
}

function getProductsWithCustomFields() {
  const products = statements.getAllProducts.all();
  const customFields = getAllCustomFields("products");

  if (customFields.length === 0) return products;

  for (const product of products) {
    product.custom_fields = {};
    for (const field of customFields) {
      const row = statements.getCustomFieldValues.get(field.id, product.id);
      if (row) product.custom_fields[field.name] = row.value;
    }
  }
  return products;
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
  return statements.getAllSuppliers.all();
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
  return db
    .prepare("SELECT * FROM warehouses WHERE is_active = 1 ORDER BY is_primary DESC, name ASC")
    .all();
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

function getWarehouseStockSummary() {
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
      FROM products p
      JOIN warehouses w ON w.is_active = 1
      LEFT JOIN warehouse_stock ws ON ws.product_id = p.id AND ws.warehouse_id = w.id
      LEFT JOIN product_reorder_levels pr ON pr.product_id = p.id AND pr.warehouse_id = w.id
      ORDER BY p.name ASC, w.name ASC`
    )
    .all();
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
      ORDER BY l.expiry_date IS NULL, l.expiry_date ASC, l.updated_at DESC`
    )
    .all(...params);
}

function getReorderAlerts() {
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
      ORDER BY (COALESCE(pr.reorder_point, 0) - COALESCE(ws.on_hand, 0)) DESC`
    )
    .all();

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
      ORDER BY date(l.expiry_date) ASC`
    )
    .all();

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
    clauses.push("date(t.txn_date) >= date(?)");
    params.push(filters.from_date);
  }
  if (filters.to_date) {
    clauses.push("date(t.txn_date) <= date(?)");
    params.push(filters.to_date);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

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
      ORDER BY datetime(t.txn_date) DESC, t.id DESC`
    )
    .all(...params);
}

function getInventoryValuationReport() {
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
      ORDER BY stock_value DESC`
    )
    .all();
}

function getExpiryReport() {
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
      ORDER BY date(l.expiry_date) ASC`
    )
    .all();
}

function queryCustomers(options = {}) {
  const sort = normalizeSort(
    options,
    ["id", "name", "phone", "email", "created_at", "updated_at"],
    "id"
  );
  return paginateQuery({
    baseFromSql: "SELECT * FROM customers",
    countFromSql: "FROM customers",
    search: options.search,
    searchColumns: ["name", "phone", "email", "address"],
    sort,
    page: options.page,
    pageSize: options.pageSize,
  });
}

function queryProducts(options = {}) {
  const sort = normalizeSort(
    options,
    ["id", "sku", "name", "price", "category", "created_at", "updated_at"],
    "id"
  );
  return paginateQuery({
    baseFromSql: "SELECT * FROM products",
    countFromSql: "FROM products",
    search: options.search,
    searchColumns: ["sku", "name", "description", "category", "unit"],
    sort,
    page: options.page,
    pageSize: options.pageSize,
  });
}

function querySuppliers(options = {}) {
  const sort = normalizeSort(
    options,
    ["id", "name", "contact_person", "phone", "email", "status", "updated_at"],
    "id"
  );
  return paginateQuery({
    baseFromSql: "SELECT * FROM suppliers",
    countFromSql: "FROM suppliers",
    search: options.search,
    searchColumns: ["name", "contact_person", "phone", "email", "tax_number", "address"],
    sort,
    page: options.page,
    pageSize: options.pageSize,
  });
}

function queryWarehouses(options = {}) {
  const sort = normalizeSort(
    options,
    ["id", "code", "name", "city", "state", "country", "updated_at"],
    "name"
  );
  return paginateQuery({
    baseFromSql: "SELECT * FROM warehouses",
    countFromSql: "FROM warehouses",
    search: options.search,
    searchColumns: ["code", "name", "address", "city", "state", "country"],
    sort,
    page: options.page,
    pageSize: options.pageSize,
  });
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
    ["id", "invoice_number", "invoice_date", "status", "total", "customer_name"],
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
    clauses.push("date(t.txn_date) >= date(?)");
    params.push(options.from_date);
  }
  if (options.to_date) {
    clauses.push("date(t.txn_date) <= date(?)");
    params.push(options.to_date);
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

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function calculateInvoiceTotals(inv, items, settings) {
  const enableTax = Number(settings?.enable_tax || 0) === 1;
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

  let subtotal = 0;
  let taxTotal = 0;
  let gross = 0;

  const normalizedItems = (Array.isArray(items) ? items : []).map((item) => {
    const qty = Number(item.qty || 1);
    const unitPrice = Number(item.unit_price || 0);
    if (!(qty > 0)) throw new Error("Invoice item quantity must be greater than zero");
    if (unitPrice < 0) throw new Error("Invoice item price cannot be negative");

    const itemTaxRateRaw = Number(
      item.tax_rate != null ? item.tax_rate : invoiceTaxRate
    );
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

    return {
      product_id: item.product_id || null,
      description: String(item.description || "").trim(),
      qty,
      unit_price: toMoney(unitPrice),
      line_subtotal: lineSubtotal,
      tax_rate: itemTaxRate,
      tax_amount: taxAmount,
      line_total: lineTotal,
    };
  });

  const discount = Math.max(0, Number(inv.discount || 0));
  const total = toMoney(Math.max(0, gross - discount));

  return {
    normalizedItems,
    subtotal,
    taxTotal: enableTax && validTaxMode !== "none" ? taxTotal : 0,
    taxName,
    taxRate: enableTax && validTaxMode !== "none" ? invoiceTaxRate : 0,
    taxMode: enableTax ? validTaxMode : "none",
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

    const info = statements.insertInvoice.run(
      inv.invoice_number || null,
      inv.customer_id || null,
      totals.subtotal,
      totals.taxTotal,
      totals.taxName,
      totals.taxRate,
      totals.taxMode,
      totals.total,
      totals.discount,
      inv.invoice_date,
      inv.due_date || null,
      inv.status || "unpaid",
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
        item.tax_rate,
        item.tax_amount,
        item.line_total
      );
    }

    return { id: invoiceId };
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
      data.category || ""
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
    const info = statements.insertInvoice.run(
      data.invoice_number,
      data.customer_id,
      totals.subtotal,
      totals.taxTotal,
      totals.taxName,
      totals.taxRate,
      totals.taxMode,
      totals.total,
      totals.discount,
      data.invoice_date,
      data.due_date || null,
      data.status || "unpaid",
      data.notes || ""
    );
    return { id: info.lastInsertRowid };
  },
  updateInvoice: (data) =>
    {
      const settings = statements.getSettings.get() || {};
      const totals = calculateInvoiceTotals(data, data.items, settings);
      return statements.updateInvoice.run(
        data.invoice_number,
        data.customer_id,
        totals.subtotal,
        totals.taxTotal,
        totals.taxName,
        totals.taxRate,
        totals.taxMode,
        totals.total,
        totals.discount,
        data.invoice_date,
        data.due_date || null,
        data.status || "unpaid",
        data.notes || "",
        data.id
      );
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
      Number(data.tax_rate || 0),
      Number(data.tax_amount || 0),
      Number(data.line_total || 0)
    ),
  getInvoiceItems: (invoiceId) => statements.getInvoiceItems.all(invoiceId),

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

  // Close DB (optional)
  close: () => db.close(),
};
