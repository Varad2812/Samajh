/**
 * Live class roster for teachers: every student account's learner model (physics mastery, misconceptions,
 * reviews, recent attempts) plus a summary of their custom tests. Polled by the teacher dashboard.
 */
import { currentUser, unauthorized } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

const MAX_STUDENTS = 200;
const RECENT_ATTEMPTS = 150;

interface SavedTrack {
  id: string;
  title?: string;
  subject?: string;
  standard?: string;
  questions?: unknown[];
}
interface SavedResult {
  finishedAt?: number;
  answers?: { correct?: boolean }[];
}
interface SavedState {
  student?: { theta?: number; misconceptions?: string[]; diagnosticDone?: boolean };
  mastery?: Record<string, unknown>;
  schedule?: Record<string, unknown>;
  attempts?: unknown[];
  tracks?: SavedTrack[];
  trackResults?: Record<string, SavedResult>;
}

export async function GET(): Promise<Response> {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (user.role !== "teacher") return Response.json({ error: "Teachers only" }, { status: 403 });
  const c = await db();
  const res = await c.execute({
    sql: `SELECT u.id, u.name, u.email, u.created_at, s.data, s.updated_at
          FROM users u LEFT JOIN user_state s ON s.user_id = u.id
          WHERE u.role = 'student' ORDER BY COALESCE(s.updated_at, u.created_at) DESC LIMIT ?`,
    args: [MAX_STUDENTS],
  });
  const students = res.rows.map((r) => {
    let state: SavedState = {};
    try {
      state = r.data ? (JSON.parse(String(r.data)) as SavedState) : {};
    } catch {
      // A corrupt snapshot shows as an empty learner model rather than breaking the class view.
    }
    const results = state.trackResults ?? {};
    const tests = (state.tracks ?? [])
      .filter((t) => results[t.id]?.answers?.length)
      .map((t) => {
        const answers = results[t.id].answers ?? [];
        return {
          id: t.id,
          title: t.title ?? "Custom test",
          subject: t.subject ?? "",
          standard: t.standard ?? "",
          correct: answers.filter((a) => a.correct).length,
          total: answers.length,
          finishedAt: results[t.id].finishedAt ?? 0,
        };
      });
    return {
      id: String(r.id),
      name: String(r.name),
      email: String(r.email),
      updatedAt: r.updated_at === null ? null : Number(r.updated_at),
      theta: state.student?.theta ?? null,
      misconceptions: state.student?.misconceptions ?? [],
      diagnosticDone: Boolean(state.student?.diagnosticDone),
      mastery: state.mastery ?? {},
      schedule: state.schedule ?? {},
      attempts: (state.attempts ?? []).slice(-RECENT_ATTEMPTS),
      tests,
    };
  });
  return Response.json({ students, at: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
