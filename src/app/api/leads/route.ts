import { NextRequest, NextResponse } from "next/server";
import { packages } from "@/lib/marketplace";
import { listLeads, saveLead } from "@/lib/store";

export const runtime = "nodejs";

const hits = new Map<string, number[]>();
const packageIds = new Set(packages.map((item) => item.id));

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 6;
}

function field(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (rateLimited(ip)) return NextResponse.json({ error: "提交过于频繁" }, { status: 429 });

  let input: Record<string, unknown>;
  try {
    input = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const name = field(input.name, 80);
  const contact = field(input.contact, 120);
  const company = field(input.company, 120);
  const note = field(input.note, 500);
  const packageId = field(input.packageId, 40);
  if (!name || !contact) return NextResponse.json({ error: "请填写联系人与联系方式" }, { status: 400 });
  if (packageId && !packageIds.has(packageId)) return NextResponse.json({ error: "套餐无效" }, { status: 400 });

  const lead = await saveLead({ name, contact, company, note, packageId });
  const webhook = process.env.BUSINESS_WEBHOOK;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: `新商务意向：${lead.name} / ${lead.contact} / ${lead.company || "未填站点"} / ${lead.packageId}`,
          text: `新商务意向：${lead.name} / ${lead.contact} / ${lead.company || "未填站点"} / ${lead.packageId}`,
          lead,
        }),
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      /* 通知失败不影响已保存的线索 */
    }
  }
  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const expected = process.env.ADMIN_TOKEN;
  const provided = request.headers.get("authorization");
  if (!expected || provided !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  return NextResponse.json({ leads: await listLeads() });
}
