import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookie } from "@/lib/auth";
import { deleteSession } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const id = request.cookies.get(SESSION_COOKIE)?.value;
  if (id) await deleteSession(id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ ...sessionCookie(""), maxAge: 0 });
  return response;
}
