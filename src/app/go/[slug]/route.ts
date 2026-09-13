import { NextResponse } from "next/server";
import { getAffiliate } from "@/lib/marketplace";
import { recordAffiliateClick } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) {
    return NextResponse.json({ error: "推广位无效" }, { status: 404 });
  }
  const partner = getAffiliate(slug);
  if (!partner) return NextResponse.json({ error: "未找到该推广位" }, { status: 404 });
  void recordAffiliateClick(slug);
  return NextResponse.redirect(partner.url, 302);
}
