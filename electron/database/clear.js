// electron/database/clear.js
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "sqlite.db");
if (!fs.existsSync(dbPath)) {
  console.error("sqlite.db not found at", dbPath);
  process.exit(1);
}

const db = new Database(dbPath);

// WARNING: This permanently deletes rows. Back up your DB if needed.
console.log("Clearing seeded tables (customers, products, suppliers, purchase_orders, inventory_lots, stock_transactions, invoices, notes, custom fields).");

const deleteOrder = [
  "stock_transactions",
  "inventory_lots",
  "product_reorder_levels",
  "warehouse_stock",
  "purchase_order_items",
  "purchase_orders",
  "suppliers",
  "custom_field_values",
  "invoice_items",
  "invoices",
  "products",
  "customers",
  "warehouses",
  "notes",
  "custom_fields"
];

db.exec("PRAGMA foreign_keys = OFF;"); // temporarily disable foreign keys while truncating

for (const table of deleteOrder) {
  try {
    db.exec(`DELETE FROM ${table};`);
    db.exec(`VACUUM;`);
    console.log(`Cleared ${table}`);
  } catch (err) {
    console.error(`Failed to clear ${table}:`, err.message);
  }
}

db.exec("PRAGMA foreign_keys = ON;");
console.log("Done.");
