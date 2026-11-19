/** The database schema; every statement is safe to run on an existing database. */
export const SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS pages (
    id         INTEGER PRIMARY KEY,
    type       TEXT NOT NULL,
    slug       TEXT NOT NULL UNIQUE,
    title      TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    meta       TEXT NOT NULL DEFAULT '{}',
    blocks     TEXT NOT NULL DEFAULT '[]',
    version    INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS revisions (
    id         INTEGER PRIMARY KEY,
    page_id    INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    snapshot   TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS folders (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    parent_id  INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS files (
    id         INTEGER PRIMARY KEY,
    filename   TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    mime       TEXT NOT NULL,
    size       INTEGER NOT NULL,
    folder_id  INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  -- Foreign keys are looked up on every cascade and folder listing.
  CREATE INDEX IF NOT EXISTS revisions_page ON revisions (page_id);
  CREATE INDEX IF NOT EXISTS files_folder ON files (folder_id);
  CREATE INDEX IF NOT EXISTS folders_parent ON folders (parent_id);
  CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);

  -- Keep updated_at current, whichever code changes a row.
  CREATE TRIGGER IF NOT EXISTS files_created AFTER INSERT ON files WHEN NEW.updated_at = ''
  BEGIN UPDATE files SET updated_at = NEW.created_at WHERE id = NEW.id; END;
  CREATE TRIGGER IF NOT EXISTS files_updated AFTER UPDATE OF name, folder_id ON files
  BEGIN UPDATE files SET updated_at = datetime('now') WHERE id = NEW.id; END;
  CREATE TRIGGER IF NOT EXISTS folders_created AFTER INSERT ON folders WHEN NEW.updated_at = ''
  BEGIN UPDATE folders SET updated_at = NEW.created_at WHERE id = NEW.id; END;
  CREATE TRIGGER IF NOT EXISTS folders_updated AFTER UPDATE OF name, parent_id ON folders
  BEGIN UPDATE folders SET updated_at = datetime('now') WHERE id = NEW.id; END;
`;
