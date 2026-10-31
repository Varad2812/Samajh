/**
 * Server-only libSQL database. Locally it is a SQLite file (`data/samajh.db`); on Vercel point
 * DATABASE_URL at a Turso database (libsql://…) with DATABASE_AUTH_TOKEN, since the serverless
 * filesystem does not persist.
 */
import { mkdirSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";

const LOCAL_URL = "file:data/samajh.db";
// Vercel functions can only write to /tmp, which is wiped on cold starts: fine for a demo, use Turso to keep data.
const SERVERLESS_URL = "file:/tmp/samajh.db";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  pw_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS user_state (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS logs_user_at ON logs(user_id, at DESC);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
`;

let ready: Promise<Client> | null = null;

async function open(): Promise<Client> {
  // TURSO_* are the names the Vercel Marketplace Turso integration sets.
  const remote = process.env.DATABASE_URL?.trim() || process.env.TURSO_DATABASE_URL?.trim();
  const url = remote || (process.env.VERCEL ? SERVERLESS_URL : LOCAL_URL);
  if (url === LOCAL_URL) mkdirSync("data", { recursive: true });
  const authToken = process.env.DATABASE_AUTH_TOKEN?.trim() || process.env.TURSO_AUTH_TOKEN?.trim() || undefined;
  const client = createClient({ url, authToken });
  await client.executeMultiple(SCHEMA);
  return client;
}

/** The shared client, with the schema created on first use. */
export function db(): Promise<Client> {
  ready ??= open().catch((err: unknown) => {
    ready = null;
    throw err;
  });
  return ready;
}
