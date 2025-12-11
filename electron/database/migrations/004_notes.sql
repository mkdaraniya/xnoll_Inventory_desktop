CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT,
  color TEXT DEFAULT '#ffffff',
  is_pinned INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notes_pinned ON notes(is_pinned);
CREATE INDEX idx_notes_created ON notes(created_at DESC);