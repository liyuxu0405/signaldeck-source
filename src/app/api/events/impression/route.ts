import { NextRequest, NextResponse } from "next/server";
import { getCommercialDestination } from "@/lib/marketplace";
import { approvedOperatorListings, recordCommercialEvent } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 1_000) return NextResponse.json({ error: "请求体过大" }, { status: 413 });
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.nextUrl.host) {
    return NextResponse.json({ error: "来源无效" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const campaignId = typeof body.campaignId === "string" ? body.campaignId.toLowerCase() : "";
  const placementId = typeof body.placementId === "string" ? body.placementId.toLowerCase() : "";
  const eventId = typeof body.eventId === "string" ? body.eventId.toLowerCase() : "";
  const path = typeof body.path === "string" ? body.path : undefined;
  const listings = await approvedOperatorListings();
  if (!getCommercialDestination(campaignId, listings)) {
    return NextResponse.json({ error: "推广活动不存在" }, { status: 404 });
  }
  try {
    await recordCommercialEvent({
      kind: "impression",
      campaignId,
      placementId,
      eventId,
      occurredAt: new Date().toISOString(),
      path,
    });
    return new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "归因参数无效" }, { status: 400 });
  }
}
