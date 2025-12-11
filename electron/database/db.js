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
      enable_reminders = ?, reminder_lead_minutes = ?, language = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `),

  // Customers
  insertCustomer: db.prepare(`
    INSERT INTO customers (name, phone, email, created_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  updateCustomer: db.prepare(`
    UPDATE customers SET name = ?, phone = ?, email = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  deleteCustomer: db.prepare("DELETE FROM customers WHERE id = ?"),
  getAllCustomers: db.prepare("SELECT * FROM customers ORDER BY id DESC"),

  // Products
  insertProduct: db.prepare(`
    INSERT INTO products (sku, name, unit, price, discount, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  updateProduct: db.prepare(`
    UPDATE products SET sku = ?, name = ?, unit = ?, price = ?, discount = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  deleteProduct: db.prepare("DELETE FROM products WHERE id = ?"),
  getAllProducts: db.prepare("SELECT * FROM products ORDER BY id DESC"),

  // Bookings
  insertBooking: db.prepare(`
    INSERT INTO bookings (customer_id, product_id, service_name, booking_date, status, discount, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  updateBooking: db.prepare(`
    UPDATE bookings SET customer_id = ?, product_id = ?, service_name = ?, booking_date = ?, status = ?, discount = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  deleteBooking: db.prepare("DELETE FROM bookings WHERE id = ?"),
  getAllBookings: db.prepare(`
    SELECT b.*,
           c.name as customer_name,
           p.name as product_name
    FROM bookings b
    LEFT JOIN customers c ON b.customer_id = c.id
    LEFT JOIN products p ON b.product_id = p.id
    ORDER BY b.id DESC
    LIMIT ? OFFSET ?
  `),
  getBookingsInRange: db.prepare(`
    SELECT b.*,
           c.name as customer_name,
           p.name as product_name
    FROM bookings b
    LEFT JOIN customers c ON b.customer_id = c.id
    LEFT JOIN products p ON b.product_id = p.id
    WHERE b.booking_date >= ? AND b.booking_date <= ?
    ORDER BY b.booking_date
  `),

  // Invoices
  insertInvoice: db.prepare(`
    INSERT INTO invoices (customer_id, booking_id, total, discount, invoice_date, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  updateInvoice: db.prepare(`
    UPDATE invoices SET customer_id = ?, booking_id = ?, total = ?, discount = ?, invoice_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  deleteInvoice: db.prepare("DELETE FROM invoices WHERE id = ?"),
  getAllInvoices: db.prepare(`
    SELECT i.*,
           c.name as customer_name,
           b.service_name
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    LEFT JOIN bookings b ON i.booking_id = b.id
    ORDER BY i.id DESC
  `),

  // Notes
  insertNote: db.prepare(`
    INSERT INTO notes (title, content, tags, is_pinned, created_at, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  updateNote: db.prepare(`
    UPDATE notes SET title = ?, content = ?, tags = ?, is_pinned = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  deleteNote: db.prepare("DELETE FROM notes WHERE id = ?"),
  getAllNotes: db.prepare(
    "SELECT * FROM notes ORDER BY is_pinned DESC, id DESC"
  ),

  // Custom Fields
  insertCustomField: db.prepare(`
    INSERT INTO custom_fields (field_name, field_label, module, field_type, is_required, display_in_grid, display_in_filter, is_sortable, is_searchable, options, default_value, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  updateCustomField: db.prepare(`
    UPDATE custom_fields SET field_name = ?, field_label = ?, module = ?, field_type = ?, is_required = ?, display_in_grid = ?, display_in_filter = ?, is_sortable = ?, is_searchable = ?, options = ?, default_value = ?, updated_at = CURRENT_TIMESTAMP
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

  // Reminders
  insertReminder: db.prepare(`
    INSERT INTO reminders (booking_id, reminder_time, status, created_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),
  updateReminder: db.prepare(`
    UPDATE reminders SET booking_id = ?, reminder_time = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  deleteReminder: db.prepare("DELETE FROM reminders WHERE id = ?"),
  getAllReminders: db.prepare("SELECT * FROM reminders ORDER BY reminder_time"),
  getDueReminders: db.prepare(
    "SELECT * FROM reminders WHERE reminder_time <= ? AND status = 'pending'"
  ),

  // Company Profile
  getCompanyProfile: db.prepare("SELECT * FROM company WHERE id = 1"),
  updateCompanyProfile: db.prepare(`
    INSERT OR REPLACE INTO company (id, name, address, phone, email, website, tax_id, logo, created_at, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),

  // SKU validation
  checkSkuExists: db.prepare(
    "SELECT id FROM products WHERE sku = ? AND id != ?"
  ),
};

// Helper function for custom fields
function getAllCustomFields(module) {
  const allFields = db
    .prepare(
      `
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
  `
    )
    .all();
  return module ? allFields.filter((f) => f.module === module) : allFields;
}

// --- Helper functions ---
function getCustomersWithCustomFields() {
  const customers = statements.getAllCustomers.all();
  const customFields = getAllCustomFields("customers");

  if (customFields.length === 0) {
    return customers;
  }

  // For each customer, fetch their custom field values
  for (const customer of customers) {
    customer.custom_fields = {};
    for (const field of customFields) {
      const value = statements.getCustomFieldValues.get(field.id, customer.id);
      if (value) {
        customer.custom_fields[field.name] = value.value;
      }
    }
  }

  return customers;
}

function getProductsWithCustomFields() {
  const products = statements.getAllProducts.all();
  const customFields = getAllCustomFields("products");

  if (customFields.length === 0) {
    return products;
  }

  // For each product, fetch their custom field values
  for (const product of products) {
    product.custom_fields = {};
    for (const field of customFields) {
      const value = statements.getCustomFieldValues.get(field.id, product.id);
      if (value) {
        product.custom_fields[field.name] = value.value;
      }
    }
  }

  return products;
}

function getBookingsWithCustomFields(page = 1, perPage = 20) {
  const offset = (page - 1) * perPage;

  const bookings = statements.getAllBookings.all(perPage, offset);
  const customFields = getAllCustomFields("bookings");

  // if (customFields.length === 0) {
  //   return bookings;
  // }

  // For each booking, fetch their custom field values
  for (const booking of bookings) {
    booking.custom_fields = {};
    for (const field of customFields) {
      const value = statements.getCustomFieldValues.get(field.id, booking.id);
      if (value) {
        booking.custom_fields[field.name] = value.value;
      }
    }
  }

  const total = statements.getAllBookings.all().length;

  return {
    rows: bookings,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage)
  };
}

function listBookingsInRange(start, end) {
  return statements.getBookingsInRange.all(start, end);
}

function checkSkuExists(sku, excludeId = null) {
  const result = statements.checkSkuExists.get(sku, excludeId || null);
  return !!result;
}

function getBookingById(id) {
  const stmt = db.prepare(`
    SELECT b.*,
           c.name as customer_name,
           p.name as product_name
    FROM bookings b
    LEFT JOIN customers c ON b.customer_id = c.id
    LEFT JOIN products p ON b.product_id = p.id
    WHERE b.id = ?
  `);
  return stmt.get(id);
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
      data.enable_reminders,
      data.reminder_lead_minutes,
      data.language
    ),

  // Customers
  insertCustomer: (data) => {
    const result = statements.insertCustomer.run(
      data.name,
      data.phone,
      data.email
    );
    return { id: result.lastInsertRowid };
  },
  updateCustomer: (data) =>
    statements.updateCustomer.run(data.name, data.phone, data.email, data.id),
  deleteCustomer: (id) => statements.deleteCustomer.run(id),
  getCustomersWithCustomFields,

  // Products
  insertProduct: (data) => {
    const result = statements.insertProduct.run(
      data.sku,
      data.name,
      data.unit,
      data.price,
      data.discount || 0
    );
    return { id: result.lastInsertRowid };
  },
  updateProduct: (data) =>
    statements.updateProduct.run(
      data.sku,
      data.name,
      data.unit,
      data.price,
      data.discount || 0,
      data.id
    ),
  deleteProduct: (id) => statements.deleteProduct.run(id),
  getProductsWithCustomFields,

  // Bookings
  insertBooking: (data) => {
    const result = statements.insertBooking.run(
      data.customer_id,
      data.product_id,
      data.service_name,
      data.booking_date,
      data.status || "pending",
      data.discount || 0
    );
    return { id: result.lastInsertRowid };
  },
  updateBooking: (data) =>
    statements.updateBooking.run(
      data.customer_id,
      data.product_id,
      data.service_name,
      data.booking_date,
      data.status,
      data.discount || 0,
      data.id
    ),
  deleteBooking: (id) => statements.deleteBooking.run(id),
  getBookingsWithCustomFields,
  listBookingsInRange,

  // Invoices
  insertInvoice: (data) => {
    const result = statements.insertInvoice.run(
      data.customer_id,
      data.booking_id,
      data.total,
      data.discount || 0,
      data.invoice_date,
      data.status || "unpaid"
    );
    return { id: result.lastInsertRowid };
  },
  updateInvoice: (data) =>
    statements.updateInvoice.run(
      data.customer_id,
      data.booking_id,
      data.total,
      data.discount || 0,
      data.invoice_date,
      data.status,
      data.id
    ),
  deleteInvoice: (id) => statements.deleteInvoice.run(id),
  getAllInvoices: () => statements.getAllInvoices.all(),

  // Notes
  insertNote: (data) => {
    const result = statements.insertNote.run(
      data.title,
      data.content,
      data.tags,
      data.is_pinned || 0
    );
    return { id: result.lastInsertRowid };
  },
  updateNote: (data) =>
    statements.updateNote.run(
      data.title,
      data.content,
      data.tags,
      data.is_pinned || 0,
      data.id
    ),
  deleteNote: (id) => statements.deleteNote.run(id),
  getAllNotes: () => statements.getAllNotes.all(),

  // Custom Fields
  insertCustomField: (data) => {
    const result = statements.insertCustomField.run(
      data.field_name,
      data.field_label,
      data.module,
      data.field_type,
      data.is_required,
      data.display_in_grid,
      data.display_in_filter,
      data.is_sortable,
      data.is_searchable,
      data.options,
      data.default_value
    );
    return { id: result.lastInsertRowid };
  },
  updateCustomField: (data) =>
    statements.updateCustomField.run(
      data.field_name,
      data.field_label,
      data.module,
      data.field_type,
      data.is_required,
      data.display_in_grid,
      data.display_in_filter,
      data.is_sortable,
      data.is_searchable,
      data.options,
      data.default_value,
      data.id
    ),
  deleteCustomField: (id) => statements.deleteCustomField.run(id),
  getAllCustomFields: (module) => {
    const allFields = statements.getAllCustomFields.all();
    return module ? allFields.filter((f) => f.module === module) : allFields;
  },
  getCustomFieldValues: (fieldId, recordId) =>
    statements.getCustomFieldValues.get(fieldId, recordId),
  saveCustomFieldValue: (data) =>
    statements.saveCustomFieldValue.run(
      data.custom_field_id,
      data.record_id,
      data.value
    ),

  // Reminders
  insertReminder: (data) => {
    const result = statements.insertReminder.run(
      data.booking_id,
      data.reminder_time,
      data.status || "pending"
    );
    return { id: result.lastInsertRowid };
  },
  updateReminder: (data) =>
    statements.updateReminder.run(
      data.booking_id,
      data.reminder_time,
      data.status,
      data.id
    ),
  deleteReminder: (id) => statements.deleteReminder.run(id),
  getAllReminders: () => statements.getAllReminders.all(),
  getDueReminders: (currentTime) => statements.getDueReminders.all(currentTime),

  // Company Profile
  getCompanyProfile: () => statements.getCompanyProfile.get(),
  updateCompanyProfile: (data) =>
    statements.updateCompanyProfile.run(
      data.name,
      data.address,
      data.phone,
      data.email,
      data.website,
      data.tax_id,
      data.logo_path
    ),

  // SKU validation
  checkSkuExists,

  // Utility
  getBookingById,
};
