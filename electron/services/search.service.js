// electron/services/search.service.js
const path = require('path');
const Database = require('better-sqlite3');
const { app } = require('electron');

const isDev = process.env.NODE_ENV === 'development';

const dbPath = isDev
  ? path.join(__dirname, '../database/sqlite.db')
  : path.join(app.getPath('userData'), 'xnoll-offline.sqlite');

  const db = new Database(dbPath);

class SearchService {
  /**
   * Global search across all modules
   */
  globalSearch(query) {
    return new Promise((resolve, reject) => {
      const searchTerm = `%${query}%`;
      const results = {
        customers: [],
        products: [],
        bookings: [],
        invoices: [],
        notes: []
      };

      let completed = 0;
      const modules = 5;

      const checkComplete = () => {
        completed++;
        if (completed === modules) {
          resolve(results);
        }
      };

      // Search customers
      db.all(
        `SELECT id, name, phone, email, 'customer' as type 
         FROM customers 
         WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
         LIMIT 10`,
        [searchTerm, searchTerm, searchTerm],
        (err, rows) => {
          if (!err) results.customers = rows;
          checkComplete();
        }
      );

      // Search products
      db.all(
        `SELECT id, sku, name, price, 'product' as type 
         FROM products 
         WHERE name LIKE ? OR sku LIKE ? OR description LIKE ?
         LIMIT 10`,
        [searchTerm, searchTerm, searchTerm],
        (err, rows) => {
          if (!err) results.products = rows;
          checkComplete();
        }
      );

      // Search bookings
      db.all(
        `SELECT b.id, b.service_name, b.booking_date, b.status, 
                c.name as customer_name, 'booking' as type
         FROM bookings b
         LEFT JOIN customers c ON b.customer_id = c.id
         WHERE b.service_name LIKE ? OR c.name LIKE ?
         LIMIT 10`,
        [searchTerm, searchTerm],
        (err, rows) => {
          if (!err) results.bookings = rows;
          checkComplete();
        }
      );

      // Search invoices
      db.all(
        `SELECT i.id, i.invoice_number, i.total, i.invoice_date, i.status,
                c.name as customer_name, 'invoice' as type
         FROM invoices i
         LEFT JOIN customers c ON i.customer_id = c.id
         WHERE i.invoice_number LIKE ? OR c.name LIKE ?
         LIMIT 10`,
        [searchTerm, searchTerm],
        (err, rows) => {
          if (!err) results.invoices = rows;
          checkComplete();
        }
      );

      // Search notes
      db.all(
        `SELECT id, title, content, tags, 'note' as type 
         FROM notes 
         WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
         LIMIT 10`,
        [searchTerm, searchTerm, searchTerm],
        (err, rows) => {
          if (!err) results.notes = rows;
          checkComplete();
        }
      );
    });
  }

  /**
   * Search within specific module
   */
  moduleSearch(module, query) {
    return new Promise((resolve, reject) => {
      const searchTerm = `%${query}%`;

      switch (module) {
        case 'customers':
          db.all(
            `SELECT * FROM customers 
             WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
             ORDER BY name`,
            [searchTerm, searchTerm, searchTerm],
            (err, rows) => {
              if (err) return reject(err);
              resolve(rows);
            }
          );
          break;

        case 'products':
          db.all(
            `SELECT * FROM products 
             WHERE name LIKE ? OR sku LIKE ? OR description LIKE ?
             ORDER BY name`,
            [searchTerm, searchTerm, searchTerm],
            (err, rows) => {
              if (err) return reject(err);
              resolve(rows);
            }
          );
          break;

        case 'bookings':
          db.all(
            `SELECT b.*, c.name as customer_name, p.name as product_name
             FROM bookings b
             LEFT JOIN customers c ON b.customer_id = c.id
             LEFT JOIN products p ON b.product_id = p.id
             WHERE b.service_name LIKE ? OR c.name LIKE ?
             ORDER BY b.booking_date DESC`,
            [searchTerm, searchTerm],
            (err, rows) => {
              if (err) return reject(err);
              resolve(rows);
            }
          );
          break;

        case 'invoices':
          db.all(
            `SELECT i.*, c.name as customer_name
             FROM invoices i
             LEFT JOIN customers c ON i.customer_id = c.id
             WHERE i.invoice_number LIKE ? OR c.name LIKE ?
             ORDER BY i.invoice_date DESC`,
            [searchTerm, searchTerm],
            (err, rows) => {
              if (err) return reject(err);
              resolve(rows);
            }
          );
          break;

        case 'notes':
          db.all(
            `SELECT * FROM notes 
             WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
             ORDER BY created_at DESC`,
            [searchTerm, searchTerm, searchTerm],
            (err, rows) => {
              if (err) return reject(err);
              resolve(rows);
            }
          );
          break;

        default:
          resolve([]);
      }
    });
  }
}

module.exports = new SearchService();