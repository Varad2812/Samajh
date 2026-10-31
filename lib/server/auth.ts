/** Server-only accounts: scrypt password hashes and opaque session tokens (only their SHA-256 is stored). */
import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db } from "./db";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = "samajh_session";
const SESSION_DAYS = 30;
const KEY_LEN = 64;

export type AccountRole = "student" | "teacher";

export interface User {
  id: string;
  email: string;
  name: string;
  role: AccountRole;
  createdAt: number;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LEN);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltHex, keyHex] = stored.split("$");
  if (algo !== "scrypt" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function rowToUser(r: Record<string, unknown>): User {
  return {
    id: String(r.id),
    email: String(r.email),
    name: String(r.name),
    role: r.role === "teacher" ? "teacher" : "student",
    createdAt: Number(r.created_at),
  };
}

export async function findUserByEmail(email: string): Promise<(User & { pwHash: string }) | null> {
  const c = await db();
  const res = await c.execute({ sql: "SELECT * FROM users WHERE email = ?", args: [email] });
  const row = res.rows[0];
  return row ? { ...rowToUser(row), pwHash: String(row.pw_hash) } : null;
}

export async function createUser(email: string, name: string, role: AccountRole, password: string): Promise<User> {
  const c = await db();
  const user: User = { id: randomUUID(), email, name, role, createdAt: Date.now() };
  await c.execute({
    sql: "INSERT INTO users (id, email, name, role, pw_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: [user.id, email, name, role, await hashPassword(password), user.createdAt],
  });
  return user;
}

/** Creates a session row and sets the httpOnly cookie. */
export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  const c = await db();
  await c.execute({ sql: "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", args: [sha256(token), userId, expires] });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const c = await db();
    await c.execute({ sql: "DELETE FROM sessions WHERE token_hash = ?", args: [sha256(token)] });
  }
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user for this request, or null. */
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const c = await db();
  const res = await c.execute({
    sql: "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
    args: [sha256(token), Date.now()],
  });
  return res.rows[0] ? rowToUser(res.rows[0]) : null;
}

export async function addLog(userId: string, kind: string, payload: unknown, at = Date.now()): Promise<void> {
  const c = await db();
  await c.execute({ sql: "INSERT INTO logs (user_id, kind, payload, at) VALUES (?, ?, ?, ?)", args: [userId, kind, JSON.stringify(payload ?? {}), at] });
}

export const unauthorized = () => Response.json({ error: "Not signed in" }, { status: 401 });

/** Parse a JSON body; null on malformed input. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
