import { NextRequest, NextResponse } from "next/server";
import { newReportId, sanitizeReport } from "@/lib/report";
import { saveReport } from "@/lib/store";

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
  if (length > 28_000) return NextResponse.json({ error: "报告过大" }, { status: 413 });

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  try {
    const report = sanitizeReport(input, newReportId(), new Date().toISOString());
    await saveReport(report);
    return NextResponse.json({ id: report.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 400 });
  }
}
