import { currentUser, unauthorized } from "@/lib/server/auth";

export async function GET(): Promise<Response> {
  const user = await currentUser();
  return user ? Response.json({ user }, { headers: { "Cache-Control": "no-store" } }) : unauthorized();
}
