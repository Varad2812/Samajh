/** Per-account learner model snapshot (the persisted zustand slices). GET loads it, PUT/POST saves it. */
import { z } from "zod";
import { currentUser, readJson, unauthorized } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

const MAX_BYTES = 2_000_000;
/** userId = the account the page thinks it is saving for; a mismatch means the session changed in another tab. */
const stateSchema = z.object({ userId: z.string().min(1), data: z.record(z.string(), z.unknown()) });

export async function GET(): Promise<Response> {
  const user = await currentUser();
  if (!user) return unauthorized();
  const c = await db();
  const res = await c.execute({ sql: "SELECT data, updated_at FROM user_state WHERE user_id = ?", args: [user.id] });
  const row = res.rows[0];
  return Response.json(
    { data: row ? (JSON.parse(String(row.data)) as unknown) : null, updatedAt: row ? Number(row.updated_at) : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function save(request: Request): Promise<Response> {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = stateSchema.safeParse(await readJson(request));
  if (!parsed.success) return Response.json({ error: "Invalid state" }, { status: 400 });
  // Never let a stale tab write one account's progress into another.
  if (parsed.data.userId !== user.id) return Response.json({ error: "account-changed" }, { status: 409 });
  const json = JSON.stringify(parsed.data.data);
  if (json.length > MAX_BYTES) return Response.json({ error: "State too large" }, { status: 413 });
  const c = await db();
  const at = Date.now();
  await c.execute({
    sql: "INSERT INTO user_state (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
    args: [user.id, json, at],
  });
  return Response.json({ ok: true, updatedAt: at });
}

export const PUT = save;
// sendBeacon on page hide can only POST.
export const POST = save;
