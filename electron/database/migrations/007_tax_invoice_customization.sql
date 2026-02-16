ALTER TABLE settings ADD COLUMN enable_tax INTEGER DEFAULT 1;
ALTER TABLE settings ADD COLUMN default_tax_name TEXT DEFAULT 'Tax';
ALTER TABLE settings ADD COLUMN default_tax_rate REAL DEFAULT 0;
ALTER TABLE settings ADD COLUMN default_tax_mode TEXT DEFAULT 'exclusive';

ALTER TABLE settings ADD COLUMN invoice_prefix TEXT DEFAULT 'INV';
ALTER TABLE settings ADD COLUMN invoice_terms TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN invoice_footer TEXT DEFAULT 'Thank you for your business!';
ALTER TABLE settings ADD COLUMN invoice_show_company_address INTEGER DEFAULT 1;
ALTER TABLE settings ADD COLUMN invoice_show_company_phone INTEGER DEFAULT 1;
ALTER TABLE settings ADD COLUMN invoice_show_company_email INTEGER DEFAULT 1;
ALTER TABLE settings ADD COLUMN invoice_show_company_tax_id INTEGER DEFAULT 1;
ALTER TABLE settings ADD COLUMN invoice_show_due_date INTEGER DEFAULT 1;
ALTER TABLE settings ADD COLUMN invoice_show_notes INTEGER DEFAULT 1;
ALTER TABLE settings ADD COLUMN invoice_decimal_places INTEGER DEFAULT 2;

ALTER TABLE invoices ADD COLUMN subtotal REAL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN tax_total REAL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN tax_name TEXT DEFAULT 'Tax';
ALTER TABLE invoices ADD COLUMN tax_rate REAL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN tax_mode TEXT DEFAULT 'exclusive';

ALTER TABLE invoice_items ADD COLUMN line_subtotal REAL DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN tax_rate REAL DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN tax_amount REAL DEFAULT 0;

UPDATE invoices
SET subtotal = CASE
  WHEN subtotal IS NULL OR subtotal = 0 THEN COALESCE(total, 0)
  ELSE subtotal
END,
tax_total = COALESCE(tax_total, 0),
tax_name = COALESCE(NULLIF(tax_name, ''), 'Tax'),
tax_rate = COALESCE(tax_rate, 0),
tax_mode = COALESCE(NULLIF(tax_mode, ''), 'exclusive');

UPDATE invoice_items
SET line_subtotal = CASE
  WHEN line_subtotal IS NULL OR line_subtotal = 0 THEN COALESCE(line_total, 0)
  ELSE line_subtotal
END,
tax_rate = COALESCE(tax_rate, 0),
tax_amount = COALESCE(tax_amount, 0);
