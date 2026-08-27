import Database from "better-sqlite3";
import { config } from "./config";

export const db = new Database(config.databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, phone TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
  password_hash TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sms_codes (
  phone TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, revoked_at TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  original_name TEXT NOT NULL, stored_name TEXT NOT NULL, mime_type TEXT NOT NULL,
  size INTEGER NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL, name TEXT NOT NULL, interval TEXT NOT NULL,
  image_id TEXT REFERENCES uploads(id) ON DELETE SET NULL, payload TEXT NOT NULL,
  data_status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reports_user_created ON reports(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS watchlist (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL, name TEXT NOT NULL, group_name TEXT NOT NULL DEFAULT '默认分组',
  created_at TEXT NOT NULL, UNIQUE(user_id, symbol)
);
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL, operator TEXT NOT NULL,
  target_value REAL NOT NULL, interval_name TEXT NOT NULL DEFAULT '实时', active INTEGER NOT NULL DEFAULT 1,
  last_triggered_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS alert_events (
  id TEXT PRIMARY KEY, alert_id TEXT NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  observed_value REAL NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL
);
`);

export const now = () => new Date().toISOString();
