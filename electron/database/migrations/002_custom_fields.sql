CREATE TABLE IF NOT EXISTS custom_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  is_required INTEGER DEFAULT 0,
  display_in_grid INTEGER DEFAULT 0,
  display_in_filter INTEGER DEFAULT 0,
  is_sortable INTEGER DEFAULT 0,
  is_searchable INTEGER DEFAULT 0,
  options TEXT,
  default_value TEXT,
  field_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(module, field_name)
);

CREATE TABLE IF NOT EXISTS custom_field_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  custom_field_id INTEGER NOT NULL,
  record_id INTEGER NOT NULL,
  value TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (custom_field_id) REFERENCES custom_fields(id) ON DELETE CASCADE
);

CREATE INDEX idx_custom_field_values ON custom_field_values(custom_field_id, record_id);