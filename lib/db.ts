import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';
import fs from 'fs';
import path from 'path';

// Ensure the data directory exists
const DB_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'webhook-watch.db');

let sqlite: Database.Database;

function initDatabase(): Database.Database {
  try {
    const conn = new Database(DB_PATH);
    conn.pragma('journal_mode = WAL');
    return conn;
  } catch (error) {
    console.error('Database connection failed or file is malformed. Recreating database...', error);
    try {
      if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
      }
    } catch (unlinkError) {
      console.error('Failed to delete corrupted database file:', unlinkError);
    }
    const conn = new Database(DB_PATH);
    conn.pragma('journal_mode = WAL');
    return conn;
  }
}

sqlite = initDatabase();

function runMigrations(conn: Database.Database): Database.Database {
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      is_pro INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      label TEXT,
      user_id TEXT REFERENCES users(id),
      is_pro INTEGER DEFAULT 0,
      request_count INTEGER DEFAULT 0,
      daily_limit INTEGER DEFAULT 100,
      expires_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      webhook_id TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
      method TEXT NOT NULL,
      headers TEXT,
      body TEXT,
      query TEXT,
      ip_address TEXT,
      user_agent TEXT,
      status_code INTEGER,
      response_time INTEGER,
      replay_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS replay_logs (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
      target_url TEXT NOT NULL,
      response_status INTEGER,
      response_time INTEGER,
      response_preview TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS token_blacklist (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `;

  try {
    conn.exec(schemaSql);
    return conn;
  } catch (error) {
    console.error('Failed to run schema migrations, resetting database...', error);
    try {
      if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
      }
    } catch (unlinkError) {
      console.error('Failed to delete database file:', unlinkError);
    }
    const freshConn = new Database(DB_PATH);
    freshConn.pragma('journal_mode = WAL');
    freshConn.exec(schemaSql);
    return freshConn;
  }
}

sqlite = runMigrations(sqlite);

// Drizzle ORM Schema definitions
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  name: text('name'),
  isPro: integer('is_pro').default(0),
  createdAt: text('created_at').notNull(),
});

export const webhooks = sqliteTable('webhooks', {
  id: text('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  label: text('label'),
  userId: text('user_id').references(() => users.id),
  isPro: integer('is_pro').default(0),
  requestCount: integer('request_count').default(0),
  dailyLimit: integer('daily_limit').default(100),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull(),
});

export const requests = sqliteTable('requests', {
  id: text('id').primaryKey(),
  webhookId: text('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  method: text('method').notNull(),
  headers: text('headers'), // Encrypted
  body: text('body'), // Encrypted
  query: text('query'), // Plain text / Stringified JSON
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  statusCode: integer('status_code'),
  responseTime: integer('response_time'),
  replayCount: integer('replay_count').default(0),
  createdAt: text('created_at').notNull(),
});

export const replayLogs = sqliteTable('replay_logs', {
  id: text('id').primaryKey(),
  requestId: text('request_id').notNull().references(() => requests.id, { onDelete: 'cascade' }),
  targetUrl: text('target_url').notNull(),
  responseStatus: integer('response_status'),
  responseTime: integer('response_time'),
  responsePreview: text('response_preview'),
  createdAt: text('created_at').notNull(),
});

export const tokenBlacklist = sqliteTable('token_blacklist', {
  id: text('id').primaryKey(),
  token: text('token').unique().notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
});

// Export drizzle db instance
export const db = drizzle(sqlite, { schema: { users, webhooks, requests, replayLogs, tokenBlacklist } });
