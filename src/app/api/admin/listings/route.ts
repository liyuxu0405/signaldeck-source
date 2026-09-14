import { NextRequest, NextResponse } from "next/server";
import { listApplications, readApplication, saveApplication } from "@/lib/store";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const expected = process.env.ADMIN_TOKEN;
  return Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "未授权" }, { status: 401 });
  return NextResponse.json({ applications: await listApplications() });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { id?: string; status?: "approved" | "rejected" };
  if (!body.id || (body.status !== "approved" && body.status !== "rejected")) {
    return NextResponse.json({ error: "参数无效" }, { status: 400 });
  }
  const current = await readApplication(body.id);
  if (!current) return NextResponse.json({ error: "申请不存在" }, { status: 404 });
  const next = { ...current, status: body.status };
  await saveApplication(next);
  return NextResponse.json({ application: next });
}
