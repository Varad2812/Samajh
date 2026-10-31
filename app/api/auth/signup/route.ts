import { z } from "zod";
import { addLog, createUser, findUserByEmail, readJson, startSession } from "@/lib/server/auth";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: z.string().trim().min(1).max(60),
  password: z.string().min(8).max(200),
  role: z.enum(["student", "teacher"]).default("student"),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return Response.json({ error: "Enter a valid email, your name and a password of at least 8 characters." }, { status: 400 });
  }
  const { email, name, password, role } = parsed.data;
  if (await findUserByEmail(email)) return Response.json({ error: "An account with that email already exists." }, { status: 409 });
  const user = await createUser(email, name, role, password);
  await startSession(user.id);
  await addLog(user.id, "signup", { role });
  return Response.json({ user });
}
