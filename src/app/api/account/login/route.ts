import { NextRequest, NextResponse } from "next/server";
import { newSessionId, normalizeEmail, sessionCookie, validEmail, verifyPassword } from "@/lib/auth";
import { getUser, saveSession } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { email?: string; password?: string };
  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  if (!validEmail(email) || !password) return NextResponse.json({ error: "请填写邮箱和密码" }, { status: 400 });
  const user = await getUser(email);
  if (!user || !(await verifyPassword(password, user.password))) {
    return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }
  const session = newSessionId();
  await saveSession(session, email);
  const response = NextResponse.json({ email });
  response.cookies.set(sessionCookie(session));
  return response;
}
