const path = require("path");
const Database = require("better-sqlite3");
const { app } = require("electron");

const isDev = process.env.NODE_ENV === "development";
const dbPath = isDev
  ? path.join(__dirname, "../database/sqlite.db")
  : path.join(app.getPath("userData"), "xnoll-offline.sqlite");

const db = new Database(dbPath);

class SearchService {
  globalSearch(query) {
    const q = `%${String(query || "").trim()}%`;
    return {
      customers: db
        .prepare(
          `SELECT id, name, phone, email, 'customer' AS type
           FROM customers
           WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
           ORDER BY id DESC LIMIT 10`
        )
        .all(q, q, q),
      products: db
        .prepare(
          `SELECT id, sku, name, price, 'product' AS type
           FROM products
           WHERE name LIKE ? OR sku LIKE ? OR description LIKE ?
           ORDER BY id DESC LIMIT 10`
        )
        .all(q, q, q),
      invoices: db
        .prepare(
          `SELECT i.id, i.invoice_number, i.total, i.invoice_date, i.status,
                  c.name AS customer_name, 'invoice' AS type
           FROM invoices i
           LEFT JOIN customers c ON i.customer_id = c.id
           WHERE i.invoice_number LIKE ? OR c.name LIKE ?
           ORDER BY i.id DESC LIMIT 10`
        )
        .all(q, q),
      suppliers: db
        .prepare(
          `SELECT id, name, phone, email, 'supplier' AS type
           FROM suppliers
           WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
           ORDER BY id DESC LIMIT 10`
        )
        .all(q, q, q),
      purchaseOrders: db
        .prepare(
          `SELECT po.id, po.po_number, po.order_date, po.status,
                  s.name AS supplier_name, 'purchase_order' AS type
           FROM purchase_orders po
           LEFT JOIN suppliers s ON po.supplier_id = s.id
           WHERE po.po_number LIKE ? OR s.name LIKE ?
           ORDER BY po.id DESC LIMIT 10`
        )
        .all(q, q),
      notes: db
        .prepare(
          `SELECT id, title, content, tags, 'note' AS type
           FROM notes
           WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
           ORDER BY id DESC LIMIT 10`
        )
        .all(q, q, q),
    };
  }

  moduleSearch(module, query) {
    const q = `%${String(query || "").trim()}%`;

    switch (module) {
      case "customers":
        return db
          .prepare(
            `SELECT * FROM customers
             WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
             ORDER BY name`
          )
          .all(q, q, q);
      case "products":
        return db
          .prepare(
            `SELECT * FROM products
             WHERE name LIKE ? OR sku LIKE ? OR description LIKE ?
             ORDER BY name`
          )
          .all(q, q, q);
      case "invoices":
        return db
          .prepare(
            `SELECT i.*, c.name AS customer_name
             FROM invoices i
             LEFT JOIN customers c ON i.customer_id = c.id
             WHERE i.invoice_number LIKE ? OR c.name LIKE ?
             ORDER BY i.invoice_date DESC`
          )
          .all(q, q);
      case "suppliers":
        return db
          .prepare(
            `SELECT * FROM suppliers
             WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
             ORDER BY name`
          )
          .all(q, q, q);
      case "purchaseOrders":
        return db
          .prepare(
            `SELECT po.*, s.name AS supplier_name
             FROM purchase_orders po
             LEFT JOIN suppliers s ON po.supplier_id = s.id
             WHERE po.po_number LIKE ? OR s.name LIKE ?
             ORDER BY po.order_date DESC`
          )
          .all(q, q);
      case "notes":
        return db
          .prepare(
            `SELECT * FROM notes
             WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
             ORDER BY created_at DESC`
          )
          .all(q, q, q);
      default:
        return [];
    }
  }
}

module.exports = new SearchService();
