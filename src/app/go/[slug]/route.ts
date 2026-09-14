import { NextResponse } from "next/server";
import { getCommercialDestination } from "@/lib/marketplace";
import { approvedOperatorListings, recordCommercialEvent } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const campaignId = slug.toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,79}$/.test(campaignId)) {
    return NextResponse.json({ error: "推广位无效" }, { status: 404 });
  }
  const destination = getCommercialDestination(campaignId, await approvedOperatorListings());
  if (!destination) return NextResponse.json({ error: "未找到该推广位" }, { status: 404 });
  const placementId = new URL(request.url).searchParams.get("p")?.toLowerCase() ?? "unspecified";
  try {
    await recordCommercialEvent({
      kind: "click",
      campaignId,
      placementId,
      eventId: crypto.randomUUID().toLowerCase(),
      occurredAt: new Date().toISOString(),
      path: new URL(request.url).pathname,
    });
  } catch {
    // 归因失败不能阻断已审核的商业跳转。
  }
  return NextResponse.redirect(destination, { status: 302, headers: { "cache-control": "private, no-store" } });
}
