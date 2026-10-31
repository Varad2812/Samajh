import { z } from "zod";
import { addLog, findUserByEmail, readJson, startSession, verifyPassword } from "@/lib/server/auth";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().max(200),
  password: z.string().max(200),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return Response.json({ error: "Enter your email and password." }, { status: 400 });
  const found = await findUserByEmail(parsed.data.email);
  if (!found || !(await verifyPassword(parsed.data.password, found.pwHash))) {
    return Response.json({ error: "Wrong email or password." }, { status: 401 });
  }
  const { pwHash: _omit, ...user } = found;
  void _omit;
  await startSession(user.id);
  await addLog(user.id, "login", {});
  return Response.json({ user });
}
