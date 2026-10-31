/** Per-account activity log: every attempt, session and study-plan event. */
import { z } from "zod";
import { currentUser, readJson, unauthorized } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

const MAX_LIMIT = 500;
const eventSchema = z.object({
  kind: z.string().min(1).max(40),
  payload: z.record(z.string(), z.unknown()).default({}),
  at: z.number().int().positive().optional(),
});
const bodySchema = z.object({ userId: z.string().min(1), events: z.array(eventSchema).min(1).max(100) });

export async function GET(request: Request): Promise<Response> {
  const user = await currentUser();
  if (!user) return unauthorized();
  const url = new URL(request.url);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get("limit")) || 200));
  const kind = url.searchParams.get("kind");
  const c = await db();
  const res = await c.execute({
    sql: `SELECT id, kind, payload, at FROM logs WHERE user_id = ?${kind ? " AND kind = ?" : ""} ORDER BY at DESC, id DESC LIMIT ?`,
    args: kind ? [user.id, kind, limit] : [user.id, limit],
  });
  const counts = await c.execute({ sql: "SELECT kind, COUNT(*) AS n FROM logs WHERE user_id = ? GROUP BY kind", args: [user.id] });
  return Response.json(
    {
      logs: res.rows.map((r) => ({ id: Number(r.id), kind: String(r.kind), payload: JSON.parse(String(r.payload)) as unknown, at: Number(r.at) })),
      counts: Object.fromEntries(counts.rows.map((r) => [String(r.kind), Number(r.n)])),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request): Promise<Response> {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return Response.json({ error: "Invalid events" }, { status: 400 });
  if (parsed.data.userId !== user.id) return Response.json({ error: "account-changed" }, { status: 409 });
  const c = await db();
  const now = Date.now();
  await c.batch(
    parsed.data.events.map((e) => ({
      sql: "INSERT INTO logs (user_id, kind, payload, at) VALUES (?, ?, ?, ?)",
      args: [user.id, e.kind, JSON.stringify(e.payload), e.at ?? now],
    })),
    "write",
  );
  return Response.json({ ok: true, count: parsed.data.events.length });
}
