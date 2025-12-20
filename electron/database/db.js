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

// --- Prepared statements ---
const statements = {
  // Settings
  getSettings: db.prepare("SELECT * FROM settings WHERE id = 1"),
  updateSettings: db.prepare(`
    UPDATE settings SET
      company_name = ?, currency = ?, auto_generate_sku = ?, sku_prefix = ?,
      language = ?,
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

  // Bookings
  insertBooking: db.prepare(`
    INSERT INTO bookings (customer_id, service_name, booking_date, status, discount, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  updateBooking: db.prepare(`
    UPDATE bookings SET customer_id = ?, service_name = ?, booking_date = ?, status = ?, discount = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  deleteBooking: db.prepare("DELETE FROM bookings WHERE id = ?"),
  getAllBookings: db.prepare(`
    SELECT b.*, c.name as customer_name
    FROM bookings b
    LEFT JOIN customers c ON b.customer_id = c.id
    ORDER BY b.id DESC
  `),
  getBookingsInRange: db.prepare(`
    SELECT b.*, c.name as customer_name
    FROM bookings b
    LEFT JOIN customers c ON b.customer_id = c.id
    WHERE b.booking_date >= ? AND b.booking_date <= ?
    ORDER BY b.booking_date
  `),

  // Booking Items
  // Booking Items
  insertBookingItem: db.prepare(`
    INSERT INTO booking_items (booking_id, product_id, qty, unit_price, line_total)
    VALUES (?, ?, ?, ?, ?)
  `),
  deleteBookingItems: db.prepare(
    "DELETE FROM booking_items WHERE booking_id = ?"
  ),
  getBookingItems: db.prepare(
    "SELECT * FROM booking_items WHERE booking_id = ?"
  ),

  // Invoices
  insertInvoice: db.prepare(`
    INSERT INTO invoices (invoice_number, customer_id, booking_id, total, discount, invoice_date, due_date, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  updateInvoice: db.prepare(`
    UPDATE invoices SET invoice_number = ?, customer_id = ?, booking_id = ?, total = ?, discount = ?, invoice_date = ?, due_date = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  deleteInvoice: db.prepare("DELETE FROM invoices WHERE id = ?"),
  getAllInvoices: db.prepare(`
    SELECT i.*, c.name as customer_name, b.service_name
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    LEFT JOIN bookings b ON i.booking_id = b.id
    ORDER BY i.id DESC
  `),

  // Invoice Items
  insertInvoiceItem: db.prepare(`
    INSERT INTO invoice_items (invoice_id, product_id, description, qty, unit_price, line_total)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  deleteInvoiceItems: db.prepare(
    "DELETE FROM invoice_items WHERE invoice_id = ?"
  ),
  getInvoiceItems: db.prepare(
    "SELECT * FROM invoice_items WHERE invoice_id = ?"
  ),

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
      phone, email, website, tax_id, currency, timezone, date_format, time_format
    ) VALUES (
      1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
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

function getBookingsWithCustomFields() {
  const bookings = statements.getAllBookings.all();
  const customFields = getAllCustomFields("bookings");

  for (const booking of bookings) {
    // 🔥 FIX: always attach items
    booking.items = statements.getBookingItems.all(booking.id);

    booking.custom_fields = {};
    for (const field of customFields) {
      const row = statements.getCustomFieldValues.get(field.id, booking.id);
      if (row) booking.custom_fields[field.name] = row.value;
    }
  }
  return bookings;
}

function getBookingsById(id) {
  const booking = db
    .prepare(
      `
    SELECT b.*, c.name as customer_name
    FROM bookings b
    LEFT JOIN customers c ON b.customer_id = c.id
    WHERE b.id = ?
  `
    )
    .get(id);

  if (booking) {
    booking.items = statements.getBookingItems.all(id);
  }
  return booking || null;
}

function getInvoiceById(id) {
  const invoice = db
    .prepare(
      `
    SELECT i.*, c.name as customer_name, b.service_name
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    LEFT JOIN bookings b ON i.booking_id = b.id
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
  products.forEach(p => productMap[p.id] = p);

  for (const invoice of invoices) {
    invoice.items = statements.getInvoiceItems.all(invoice.id);

    // Enrich items with product name if available
    if (Array.isArray(invoice.items)) {
      invoice.items = invoice.items.map(item => ({
        ...item,
        product_name: productMap[item.product_id]?.name || item.description || "Unknown Item"
      }));
    } else {
      invoice.items = [];
    }
  }

  return invoices;
}

function checkSkuExists(sku, excludeId = null) {
  const result = statements.checkSkuExists.get(sku, excludeId || 0);
  return !!result;
}

/**
 * ✅ Create booking with items (ATOMIC)
 * - Inserts booking ONCE
 * - Inserts multiple booking_items
 * - Uses transaction (ERP-safe)
 */
function createBookingWithItems(data) {
  return db.transaction(() => {
    // 1️⃣ Create booking header
    const bookingInfo = statements.insertBooking.run(
      data.customer_id || null,
      data.service_name || "",
      data.booking_date,
      data.status || "pending",
      data.discount || 0,
      data.notes || ""
    );

    const bookingId = bookingInfo.lastInsertRowid;

    // 2️⃣ Validate items
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("Booking must contain at least one item");
    }

    // 3️⃣ Insert booking items
    for (const item of data.items) {
      if (!item.product_id) {
        throw new Error("Product ID is required in booking item");
      }

      const qty = Number(item.qty || 1);
      const unitPrice = Number(item.unit_price || 0);
      const lineTotal =
        item.line_total != null ? Number(item.line_total) : qty * unitPrice;

      statements.insertBookingItem.run(
        bookingId,
        item.product_id,
        qty,
        unitPrice,
        lineTotal
      );
    }

    return { id: bookingId };
  })();
}

/**
 * ✅ Update booking with items (ATOMIC)
 * - Updates booking header
 * - Deletes old items
 * - Inserts new items
 */
function updateBookingWithItems(data) {
  return db.transaction(() => {
    if (!data.id) {
      throw new Error("Booking ID is required for update");
    }

    // 1️⃣ Update booking header
    statements.updateBooking.run(
      data.customer_id || null,
      data.service_name || "",
      data.booking_date,
      data.status || "pending",
      data.discount || 0,
      data.notes || "",
      data.id
    );

    // 2️⃣ Replace items
    statements.deleteBookingItems.run(data.id);

    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("Booking must contain at least one item");
    }

    for (const item of data.items) {
      const qty = Number(item.qty || 1);
      const unitPrice = Number(item.unit_price || 0);
      const lineTotal =
        item.line_total != null ? Number(item.line_total) : qty * unitPrice;

      statements.insertBookingItem.run(
        data.id,
        item.product_id,
        qty,
        unitPrice,
        lineTotal
      );
    }

    return { id: data.id };
  })();
}

/**
 * ✅ Delete booking with items
 */
function deleteBookingWithItems(id) {
  return db.transaction(() => {
    statements.deleteBookingItems.run(id);
    statements.deleteBooking.run(id);
    return true;
  })();
}

/**
 * Create invoice with items (ATOMIC)
 * payload: { invoice: { invoice_number, customer_id, booking_id, total, discount, invoice_date, due_date, status, notes }, items: [ { product_id, description, qty, unit_price, line_total } ] }
 */
function createInvoiceWithItems(data) {
  return db.transaction(() => {
    const inv = data.invoice || data; // allow old payload shape
    const info = statements.insertInvoice.run(
      inv.invoice_number || null,
      inv.customer_id || null,
      inv.booking_id || null,
      inv.total || 0,
      inv.discount || 0,
      inv.invoice_date,
      inv.due_date || null,
      inv.status || "unpaid",
      inv.notes || ""
    );
    const invoiceId = info.lastInsertRowid;

    if (Array.isArray(data.items)) {
      for (const it of data.items) {
        const qty = Number(it.qty || 1);
        const unitPrice = Number(it.unit_price || 0);
        const lineTotal =
          it.line_total != null ? Number(it.line_total) : qty * unitPrice;
        statements.insertInvoiceItem.run(
          invoiceId,
          it.product_id || null,
          it.description || "",
          qty,
          unitPrice,
          lineTotal
        );
      }
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
      data.language
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
  createBookingWithItems,
  updateBookingWithItems,
  deleteBookingWithItems,
  createInvoiceWithItems,
  // Bookings
  insertBooking: (data) => {
    const info = statements.insertBooking.run(
      data.customer_id,
      data.service_name || "",
      data.booking_date,
      data.status || "pending",
      data.discount || 0,
      data.notes || ""
    );
    return { id: info.lastInsertRowid };
  },
  updateBooking: (data) =>
    statements.updateBooking.run(
      data.customer_id,
      data.service_name || "",
      data.booking_date,
      data.status || "pending",
      data.discount || 0,
      data.notes || "",
      data.id
    ),
  deleteBooking: (id) => {
    db.transaction(() => {
      statements.deleteBookingItems.run(id);
      statements.deleteBooking.run(id);
    })();
  },
  getBookingsWithCustomFields,
  listBookingsInRange: (start, end) =>
    statements.getBookingsInRange.all(start, end),
  getBookingsById,
  insertBookingItem: (data) =>
    statements.insertBookingItem.run(
      data.booking_id,
      data.product_id,
      data.unit_price,
      data.line_total
    ),
  getBookingItems: (bookingId) => statements.getBookingItems.all(bookingId),

  // Invoices
  insertInvoice: (data) => {
    const info = statements.insertInvoice.run(
      data.invoice_number,
      data.customer_id,
      data.booking_id || null,
      data.total || 0,
      data.discount || 0,
      data.invoice_date,
      data.due_date || null,
      data.status || "unpaid",
      data.notes || ""
    );
    return { id: info.lastInsertRowid };
  },
  updateInvoice: (data) =>
    statements.updateInvoice.run(
      data.invoice_number,
      data.customer_id,
      data.booking_id || null,
      data.total || 0,
      data.discount || 0,
      data.invoice_date,
      data.due_date || null,
      data.status || "unpaid",
      data.notes || "",
      data.id
    ),
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
      data.description,
      data.unit_price,
      data.line_total
    ),
  getInvoiceItems: (invoiceId) => statements.getInvoiceItems.all(invoiceId),

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
      data.time_format || "12h"
    ),

  // SKU validation
  checkSkuExists,

  // Close DB (optional)
  close: () => db.close(),
};
