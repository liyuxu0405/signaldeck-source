import { NextRequest, NextResponse } from "next/server";
import { publishReportDraft } from "@/lib/store";

export const runtime = "nodejs";

const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 8;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (rateLimited(ip)) return NextResponse.json({ error: "请求过于频繁，请一分钟后再试" }, { status: 429 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 512) return NextResponse.json({ error: "请求体过大" }, { status: 413 });

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json({ error: "发布凭据无效" }, { status: 400 });
  }
  const body = input as Record<string, unknown>;
  if (Object.keys(body).length !== 1 || typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token)) {
    return NextResponse.json({ error: "发布凭据无效" }, { status: 400 });
  }
  try {
    const report = await publishReportDraft(body.token);
    if (!report) return NextResponse.json({ error: "发布凭据已失效" }, { status: 410 });
    return NextResponse.json({ id: report.id }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "报告暂时无法发布，请稍后重试" }, { status: 503 });
  }
}
