import { NextRequest, NextResponse } from "next/server";
import { listApplications, readApplication, saveApplication } from "@/lib/store";
import { secureEndpoint } from "@/lib/safe-endpoint";

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
  let domainVerifiedAt = current.domainVerifiedAt;
  if (body.status === "approved") {
    if (!current.verificationToken) return NextResponse.json({ error: "申请缺少域名验证令牌" }, { status: 409 });
    let response: Response;
    try {
      const { url } = await secureEndpoint(`https://${current.domain}/.well-known/signaldeck-verification.txt`);
      response = await fetch(url, {
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
        headers: { accept: "text/plain" },
      });
    } catch {
      return NextResponse.json({ error: "无法读取域名验证文件" }, { status: 409 });
    }
    const content = (await response.text()).trim();
    if (!response.ok || content !== current.verificationToken) {
      return NextResponse.json({ error: "域名所有权验证未通过" }, { status: 409 });
    }
    domainVerifiedAt = new Date().toISOString();
  }
  const next = { ...current, status: body.status, domainVerifiedAt };
  await saveApplication(next);
  return NextResponse.json({ application: next });
}
