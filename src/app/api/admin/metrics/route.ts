import { NextRequest, NextResponse } from "next/server";
import { listCommercialMetrics } from "@/lib/store";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const expected = process.env.ADMIN_TOKEN;
  return Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
  const from = request.nextUrl.searchParams.get("from") ?? weekAgo;
  const to = request.nextUrl.searchParams.get("to") ?? today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "日期格式无效" }, { status: 400 });
  }
  const span = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  if (span < 0 || span > 30 * 86_400_000) {
    return NextResponse.json({ error: "查询范围最多 31 天" }, { status: 400 });
  }
  const rows = await listCommercialMetrics({ from, to });
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  return NextResponse.json({
    from,
    to,
    totals: { impressions, clicks, ctr: impressions ? Number((clicks / impressions).toFixed(4)) : null },
    rows,
  }, { headers: { "cache-control": "no-store" } });
}
