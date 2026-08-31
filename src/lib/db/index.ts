import initSqlJs, { type Database } from "sql.js";
import { drizzle, type SQLJsDatabase } from "drizzle-orm/sql-js";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

const DB_PATH = path.join(process.cwd(), "data", "minesweeper.db");

const globalForDb = globalThis as unknown as {
  dbInit?: Promise<{ sqlite: Database; db: SQLJsDatabase<typeof schema> }>;
};

function persist(sqlite: Database) {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const data = sqlite.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function initSchema(sqlite: Database) {
  sqlite.run("PRAGMA foreign_keys = ON;");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      seed TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'standard',
      ranked INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'playing',
      season_id TEXT,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      time_ms INTEGER,
      clicks INTEGER,
      three_bv INTEGER,
      moves_json TEXT
    );
    CREATE INDEX IF NOT EXISTS games_leaderboard_idx ON games(difficulty, season_id, time_ms);
    CREATE TABLE IF NOT EXISTS personal_bests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      difficulty TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'standard',
      time_ms INTEGER NOT NULL,
      three_bv INTEGER NOT NULL,
      game_id TEXT REFERENCES games(id),
      achieved_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS pb_user_diff_idx ON personal_bests(user_id, difficulty, mode);
    CREATE TABLE IF NOT EXISTS duel_queue (
      user_id TEXT PRIMARY KEY,
      difficulty TEXT NOT NULL,
      joined_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS duel_queue_diff_idx ON duel_queue(difficulty);
    CREATE TABLE IF NOT EXISTS duel_matches (
      id TEXT PRIMARY KEY,
      difficulty TEXT NOT NULL,
      seed TEXT NOT NULL,
      safe_x INTEGER NOT NULL,
      safe_y INTEGER NOT NULL,
      player1_id TEXT NOT NULL REFERENCES users(id),
      player2_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'active',
      winner_id TEXT,
      player1_outcome TEXT,
      player2_outcome TEXT,
      player1_time_ms INTEGER,
      player2_time_ms INTEGER,
      player1_elo_delta INTEGER,
      player2_elo_delta INTEGER,
      created_at INTEGER NOT NULL,
      finished_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS duel_matches_status_idx ON duel_matches(status);
  `);
  migrateUsersElo(sqlite);
}

function migrateUsersElo(sqlite: Database) {
  try {
    sqlite.run("ALTER TABLE users ADD COLUMN elo INTEGER NOT NULL DEFAULT 1000");
  } catch {
    // column already exists
  }
}

async function initDb() {
  const SQL = await initSqlJs({
    locateFile: (file) =>
      path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
  });

  const sqlite = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  initSchema(sqlite);
  const db = drizzle(sqlite, { schema });
  persist(sqlite);

  return { sqlite, db };
}

async function getDbContext() {
  if (!globalForDb.dbInit) {
    globalForDb.dbInit = initDb();
  }
  return globalForDb.dbInit;
}

export async function getDb() {
  const { db } = await getDbContext();
  return db;
}

export async function saveDatabase() {
  const { sqlite } = await getDbContext();
  persist(sqlite);
}
