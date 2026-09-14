import { NextRequest, NextResponse } from "next/server";
import { hashPassword, newSessionId, normalizeEmail, sessionCookie, validEmail } from "@/lib/auth";
import { consumeRateLimit, getUser, saveSession, saveUser } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  if (!(await consumeRateLimit("register", ip, 5, 15 * 60))) {
    return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });
  }
  const body = await request.json().catch(() => ({})) as { email?: string; password?: string };
  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  if (!validEmail(email) || password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: "请使用有效邮箱，密码至少 8 位" }, { status: 400 });
  }
  if (await getUser(email)) return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
  await saveUser({ email, password: await hashPassword(password), createdAt: new Date().toISOString() });
  const session = newSessionId();
  await saveSession(session, email);
  const response = NextResponse.json({ email });
  response.cookies.set(sessionCookie(session));
  return response;
}
