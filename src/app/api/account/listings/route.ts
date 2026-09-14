import { NextRequest, NextResponse } from "next/server";
import { domainVerificationToken, emailFromRequest } from "@/lib/auth";
import { listApplications, saveApplication, type ListingApplication } from "@/lib/store";

export const runtime = "nodejs";

function hostFrom(value: string) {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    if (url.protocol !== "https:") return null;
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const email = await emailFromRequest(request);
  if (!email) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  return NextResponse.json({ applications: await listApplications(email) });
}

export async function POST(request: NextRequest) {
  const email = await emailFromRequest(request);
  if (!email) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, string>;
  const name = (body.name ?? "").trim().slice(0, 80);
  const summary = (body.summary ?? "").trim().slice(0, 200);
  const packageId = (body.packageId ?? "featured").trim();
  const allowed = new Set(["featured", "pro", "sponsor", "banner"]);
  const domain = hostFrom(body.domain ?? "");
  if (!name || !domain) return NextResponse.json({ error: "请填写名称与 HTTPS 域名" }, { status: 400 });
  if (!allowed.has(packageId)) return NextResponse.json({ error: "套餐无效" }, { status: 400 });
  const verificationSecret = process.env.DOMAIN_VERIFICATION_SECRET ?? process.env.ADMIN_TOKEN;
  if (!verificationSecret || verificationSecret.length < 32) {
    return NextResponse.json({ error: "域名验证服务未配置" }, { status: 503 });
  }
  const verificationToken = await domainVerificationToken(email, domain, verificationSecret);
  const app: ListingApplication = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    email,
    name,
    domain,
    summary: summary || "站长提交的付费展示申请。",
    href: `https://${domain}`,
    packageId,
    group: body.group || undefined,
    status: "pending",
    createdAt: new Date().toISOString(),
    verificationToken,
  };
  await saveApplication(app);
  return NextResponse.json({
    application: app,
    verification: { path: "/.well-known/signaldeck-verification.txt", content: verificationToken },
  });
}
