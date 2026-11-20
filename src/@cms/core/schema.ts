/** Earlier versions kept per page; older ones are removed by the trigger "pages_revision". */
export const MAX_REVISIONS = 50;

/** The database schema; every statement is safe to run on an existing database. */
export const SCHEMA = /*sql*/ `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS pages (
    id         INTEGER PRIMARY KEY,
    type       TEXT NOT NULL,
    slug       TEXT NOT NULL UNIQUE,
    title      TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    version    INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    content    TEXT NOT NULL DEFAULT '{"blocks":[]}'
  );

  CREATE TABLE IF NOT EXISTS revisions (
    id         INTEGER PRIMARY KEY,
    page_id    INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    slug       TEXT NOT NULL,
    title      TEXT NOT NULL,
    status     TEXT NOT NULL,
    version    INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    content    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS folders (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    parent_id  INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS files (
    id         INTEGER PRIMARY KEY,
    filename   TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    mime       TEXT NOT NULL,
    size       INTEGER NOT NULL,
    folder_id  INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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

  -- Keep updated_at current, whichever code changes a row (new rows get it by default).
  -- Only the listed columns count as a change; updated_at itself isn't one, so no loop.
  CREATE TRIGGER IF NOT EXISTS pages_updated
  AFTER UPDATE OF type, slug, title, status, content ON pages
  BEGIN UPDATE pages SET updated_at = datetime('now') WHERE id = NEW.id; END;

  -- Every change of a page keeps the replaced version (also for changes made outside
  -- the CMS) and drops the oldest ones. Setting the same values again keeps nothing.
  CREATE TRIGGER IF NOT EXISTS pages_revision
  AFTER UPDATE OF type, slug, title, status, content ON pages
  WHEN OLD.type IS NOT NEW.type OR OLD.slug IS NOT NEW.slug OR OLD.title IS NOT NEW.title
    OR OLD.status IS NOT NEW.status OR OLD.content IS NOT NEW.content
  BEGIN
    INSERT INTO revisions (page_id, type, slug, title, status, version, updated_at, content)
    VALUES (OLD.id, OLD.type, OLD.slug, OLD.title, OLD.status, OLD.version, OLD.updated_at,
      OLD.content);
    DELETE FROM revisions WHERE page_id = OLD.id AND id NOT IN
      (SELECT id FROM revisions WHERE page_id = OLD.id ORDER BY id DESC LIMIT ${MAX_REVISIONS});
  END;

  CREATE TRIGGER IF NOT EXISTS users_updated
  AFTER UPDATE OF username, role, password_hash ON users
  BEGIN UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id; END;
  CREATE TRIGGER IF NOT EXISTS files_updated
  AFTER UPDATE OF name, folder_id ON files
  BEGIN UPDATE files SET updated_at = datetime('now') WHERE id = NEW.id; END;
  CREATE TRIGGER IF NOT EXISTS folders_updated
  AFTER UPDATE OF name, parent_id ON folders
  BEGIN UPDATE folders SET updated_at = datetime('now') WHERE id = NEW.id; END;
`;
