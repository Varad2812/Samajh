import { addLog, currentUser, endSession } from "@/lib/server/auth";

export async function POST(): Promise<Response> {
  const user = await currentUser();
  if (user) await addLog(user.id, "logout", {});
  await endSession();
  return Response.json({ ok: true });
}
