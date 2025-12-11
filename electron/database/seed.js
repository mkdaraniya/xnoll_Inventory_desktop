// electron/database/seed.js
// Fast relational seeder for Better-SQLite3 used by Xnoll Desktop
// WARNING: This will insert a lot of rows. Tune constants below.

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { faker } = require("@faker-js/faker");

// CONFIG - change these numbers if you want different distribution
const CUSTOMERS = 20000;
const PRODUCTS  = 5000;
const BOOKINGS  = 80000;   // must match INVOICES if you want 1 invoice per booking
const INVOICES  = 80000;   // = BOOKINGS
const NOTES     = 2000;

// Batch sizes for transactions (tweak if you run into memory issues)
const BATCH_SIZE = 1000;

// DB path - adjust if your db is in another location
const dbPath = path.join(__dirname, "sqlite.db");
if (!fs.existsSync(dbPath)) {
  console.error("ERROR: sqlite.db not found at", dbPath);
  process.exit(1);
}

const db = new Database(dbPath, { verbose: null });

// Helper to run in a transaction
function runTransaction(fn) {
  const txn = db.transaction(fn);
  txn();
}

// Utility
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}

console.log("Seeder starting...");

// 1) Create some useful custom fields if missing
function seedCustomFields() {
  const exists = db.prepare("SELECT 1 FROM custom_fields LIMIT 1").get();
  if (exists) {
    console.log("Custom fields already present, skipping creation.");
    return;
  }

  const insert = db.prepare(`
    INSERT INTO custom_fields (field_name, field_label, module, field_type, options, is_required, display_in_grid, display_in_filter, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const fields = [
    ["membership_type", "Membership Type", "customers", "select", "Regular,Silver,Gold,Platinum"],
    ["customer_notes", "Customer Notes", "customers", "text", null],
    ["brand", "Brand", "products", "text", null],
    ["color", "Color", "products", "text", null],
    ["staff_name", "Staff Name", "bookings", "text", null],
    ["booking_source", "Booking Source", "bookings", "select", "Online,Phone,Walk-in"]
  ];

  runTransaction(() => {
    for (const f of fields) insert.run(...f);
  });

  console.log("Custom fields created.");
}

// 2) Seed customers
function seedCustomers(count) {
  console.log("Seeding customers:", count);
  const insert = db.prepare(`
    INSERT INTO customers (name, phone, email, created_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const cfGet = db.prepare(`SELECT id, field_name, field_type, options FROM custom_fields WHERE module = 'customers'`);
  const cfInsert = db.prepare(`
    INSERT INTO custom_field_values (custom_field_id, record_id, value, created_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  let created = 0;
  while (created < count) {
    const batch = Math.min(BATCH_SIZE, count - created);
    runTransaction(() => {
      for (let i = 0; i < batch; i++) {
        const name = faker.person.fullName();
        const phone = faker.phone.number("+91##########");
        const email = faker.internet.email().toLowerCase();

        const res = insert.run(name, phone, email);
        const rowId = res.lastInsertRowid;

        // assign custom fields
        const fields = cfGet.all();
        for (const f of fields) {
          let value = "";
          if (f.field_type === "text") value = faker.lorem.words(4);
          else if (f.field_type === "select") {
            const opts = (f.options || "").split(",").map(s => s.trim()).filter(Boolean);
            value = opts.length ? faker.helpers.arrayElement(opts) : "";
          } else value = "";

          if (value !== "") cfInsert.run(f.id, rowId, value);
        }
      }
    });

    created += batch;
    process.stdout.write(`Customers inserted: ${created}/${count}\r`);
  }
  console.log("\nCustomers seeded.");
}

// 3) Seed products
function seedProducts(count) {
  console.log("Seeding products:", count);
  const insert = db.prepare(`
    INSERT INTO products (sku, name, unit, price, discount, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const cfGet = db.prepare(`SELECT id, field_name, field_type, options FROM custom_fields WHERE module = 'products'`);
  const cfInsert = db.prepare(`
    INSERT INTO custom_field_values (custom_field_id, record_id, value, created_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  let created = 0;
  while (created < count) {
    const batch = Math.min(BATCH_SIZE, count - created);
    runTransaction(() => {
      for (let i = 0; i < batch; i++) {
        const sku = "SKU-" + faker.string.alphanumeric(10).toUpperCase();
        const name = faker.commerce.productName();
        const unit = faker.helpers.arrayElement(["pcs", "box", "kg", "ltr"]);
        const price = faker.number.int({ min: 50, max: 20000 });
        const discount = faker.number.int({ min: 0, max: 30 });

        const res = insert.run(sku, name, unit, price, discount);
        const rowId = res.lastInsertRowid;

        // assign custom fields
        const fields = cfGet.all();
        for (const f of fields) {
          let value = "";
          if (f.field_type === "text") value = faker.company.name();
          else if (f.field_type === "select") {
            const opts = (f.options || "").split(",").map(s => s.trim()).filter(Boolean);
            value = opts.length ? faker.helpers.arrayElement(opts) : "";
          }

          if (value !== "") cfInsert.run(f.id, rowId, value);
        }
      }
    });
    created += batch;
    process.stdout.write(`Products inserted: ${created}/${count}\r`);
  }
  console.log("\nProducts seeded.");
}

// 4) Seed bookings (connected to customers & products)
function seedBookings(count) {
  console.log("Seeding bookings:", count);
  // prepare statements
  const insert = db.prepare(`
    INSERT INTO bookings (customer_id, product_id, service_name, booking_date, status, discount, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const cfGet = db.prepare(`SELECT id, field_name, field_type, options FROM custom_fields WHERE module = 'bookings'`);
  const cfInsert = db.prepare(`
    INSERT INTO custom_field_values (custom_field_id, record_id, value, created_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  // Fetch existing ids once (will fit in memory)
  const customerIds = db.prepare(`SELECT id FROM customers`).all().map(r => r.id);
  const productIds  = db.prepare(`SELECT id FROM products`).all().map(r => r.id);

  if (customerIds.length === 0 || productIds.length === 0) {
    console.error("ERROR: customers or products table empty. Seed them first.");
    process.exit(1);
  }

  let created = 0;
  while (created < count) {
    const batch = Math.min(BATCH_SIZE, count - created);
    runTransaction(() => {
      for (let i = 0; i < batch; i++) {
        const customer_id = faker.helpers.arrayElement(customerIds);
        const product_id = faker.helpers.arrayElement(productIds);
        const service_name = faker.commerce.productName();
        const booking_date = randomDate(new Date(2024,0,1), new Date(2025,11,31));
        const status = faker.helpers.arrayElement(["pending", "confirmed", "completed", "cancelled"]);
        const discount = faker.number.int({ min: 0, max: 20 });

        const res = insert.run(customer_id, product_id, service_name, booking_date, status, discount);
        const rowId = res.lastInsertRowid;

        // assign booking-level custom fields
        const fields = cfGet.all();
        for (const f of fields) {
          let value = "";
          if (f.field_type === "text") value = faker.person.fullName();
          else if (f.field_type === "select") {
            const opts = (f.options || "").split(",").map(s => s.trim()).filter(Boolean);
            value = opts.length ? faker.helpers.arrayElement(opts) : "";
          }
          if (value !== "") cfInsert.run(f.id, rowId, value);
        }
      }
    });

    created += batch;
    process.stdout.write(`Bookings inserted: ${created}/${count}\r`);
  }

  console.log("\nBookings seeded.");
}

// 5) Seed invoices (one per booking)
function seedInvoices(count) {
  console.log("Seeding invoices:", count);

  const insert = db.prepare(`
    INSERT INTO invoices (customer_id, booking_id, total, discount, invoice_date, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const bookingRows = db.prepare(`SELECT id, customer_id FROM bookings`).all();
  if (bookingRows.length === 0) {
    console.error("ERROR: bookings table empty. Seed bookings first.");
    process.exit(1);
  }

  // If requested count > bookings available, use bookings.length
  const useCount = Math.min(count, bookingRows.length);

  let created = 0;
  for (let i = 0; i < useCount; i += BATCH_SIZE) {
    const batch = bookingRows.slice(i, i + BATCH_SIZE);
    runTransaction(() => {
      for (const b of batch) {
        const total = faker.number.int({ min: 100, max: 20000 });
        const discount = faker.number.int({ min: 0, max: 20 });
        const invoice_date = randomDate(new Date(2024,0,1), new Date());
        const status = faker.helpers.arrayElement(["paid", "unpaid", "partial"]);

        insert.run(b.customer_id, b.id, total, discount, invoice_date, status);
      }
    });
    created += batch.length;
    process.stdout.write(`Invoices inserted: ${created}/${useCount}\r`);
  }

  console.log("\nInvoices seeded.");
}

// 6) Seed notes (optional)
function seedNotes(count) {
  console.log("Seeding notes:", count);
  const insert = db.prepare(`
    INSERT INTO notes (title, content, tags, is_pinned, created_at, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  let created = 0;
  while (created < count) {
    const batch = Math.min(BATCH_SIZE, count - created);
    runTransaction(() => {
      for (let i = 0; i < batch; i++) {
        const title = faker.lorem.sentence(3);
        const content = faker.lorem.paragraphs(1);
        const tags = faker.helpers.arrayElements(["todo","important","followup","billing"], faker.number.int({ min: 0, max: 2 })).join(",");
        const pinned = faker.datatype.boolean();
        insert.run(title, content, tags, pinned ? 1 : 0);
      }
    });
    created += batch;
    process.stdout.write(`Notes inserted: ${created}/${count}\r`);
  }
  console.log("\nNotes seeded.");
}

// MAIN
try {
  seedCustomFields();
  seedCustomers(CUSTOMERS);
  seedProducts(PRODUCTS);
  seedBookings(BOOKINGS);
  seedInvoices(INVOICES);
  seedNotes(NOTES);

  console.log("✅ Seeding complete.");
} catch (err) {
  console.error("Seeder failed:", err);
  process.exit(1);
}
