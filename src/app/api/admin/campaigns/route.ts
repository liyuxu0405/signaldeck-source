import { NextRequest, NextResponse } from "next/server";
import { listCampaigns, saveCampaign } from "@/lib/store";
import type { CampaignRecord } from "@/lib/campaign";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const expected = process.env.ADMIN_TOKEN;
  return Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "未授权" }, { status: 401 });
  return NextResponse.json({ campaigns: await listCampaigns() }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8_000) return NextResponse.json({ error: "请求体过大" }, { status: 413 });
  const body = await request.json().catch(() => null) as CampaignRecord | null;
  if (!body) return NextResponse.json({ error: "参数无效" }, { status: 400 });
  try {
    return NextResponse.json({ campaign: await saveCampaign(body) });
  } catch (reason) {
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "活动无效" }, { status: 400 });
  }
}
