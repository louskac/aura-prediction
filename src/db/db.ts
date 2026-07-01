import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";

const globalForDb = global as unknown as {
  sqlite: Database.Database | undefined;
};

let sqlite: Database.Database;

// SQLite database file path
const dbPath = path.join(process.cwd(), "data.db");

if (process.env.NODE_ENV === "production") {
  sqlite = new Database(dbPath);
} else {
  if (!globalForDb.sqlite) {
    globalForDb.sqlite = new Database(dbPath);
  }
  sqlite = globalForDb.sqlite;
}

export const db = drizzle(sqlite, { schema });
export * as schema from "./schema";

// Helper function to initialize database tables if they do not exist
export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS fixtures (
      fixture_id INTEGER PRIMARY KEY,
      start_time INTEGER NOT NULL,
      competition_id INTEGER NOT NULL,
      competition TEXT NOT NULL,
      fixture_group_id INTEGER,
      participant1 TEXT NOT NULL,
      participant2 TEXT NOT NULL,
      status TEXT NOT NULL,
      score1 INTEGER DEFAULT 0,
      score2 INTEGER DEFAULT 0,
      last_updated INTEGER NOT NULL
    );
    
    -- Migration: add fixture_group_id to existing databases that don't have it
    -- SQLite ignores duplicate column errors only with a try/catch in app code, 
    -- so we use a safe check via pragma

    CREATE TABLE IF NOT EXISTS bracket_predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL,
      stage TEXT NOT NULL,
      match_key TEXT NOT NULL,
      predicted_winner TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS markets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      fixture_id INTEGER,
      target_value TEXT,
      yes_price INTEGER NOT NULL DEFAULT 50,
      no_price INTEGER NOT NULL DEFAULT 50,
      status TEXT NOT NULL DEFAULT 'Active',
      created_at INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL,
      market_id INTEGER NOT NULL,
      yes_shares INTEGER NOT NULL DEFAULT 0,
      no_shares INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (market_id) REFERENCES markets(id)
    );
    
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL,
      market_id INTEGER NOT NULL,
      order_type TEXT NOT NULL,
      price INTEGER NOT NULL,
      shares_count INTEGER NOT NULL,
      shares_remaining INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (market_id) REFERENCES markets(id)
    );
    
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_id INTEGER NOT NULL,
      buyer TEXT NOT NULL,
      seller TEXT NOT NULL,
      shares_count INTEGER NOT NULL,
      price INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (market_id) REFERENCES markets(id)
    );
  `);

  // Safe migration: add fixture_group_id if it doesn't already exist
  try {
    sqlite.exec(`ALTER TABLE fixtures ADD COLUMN fixture_group_id INTEGER;`);
  } catch (_) {
    // Column already exists — ignore
  }
}
