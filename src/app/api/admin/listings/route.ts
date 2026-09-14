import { NextRequest, NextResponse } from "next/server";
import { listApplications, readApplication, saveApplication } from "@/lib/store";
import { workerSecret } from "@/lib/runtime-env";
import { ensureUsdtQuote } from "@/lib/usdt-settle";

export const runtime = "nodejs";

async function authorized(request: NextRequest) {
  const expected = await workerSecret("ADMIN_TOKEN");
  return Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`);
}

export async function GET(request: NextRequest) {
  if (!await authorized(request)) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const rows = await listApplications();
  const applications = await Promise.all(rows.map(async (item) => {
    if (item.paidAt || item.status === "rejected" || (item.usdtAmount && item.usdtMicro)) return item;
    return ensureUsdtQuote(item);
  }));
  return NextResponse.json({ applications });
}

export async function POST(request: NextRequest) {
  if (!await authorized(request)) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as {
    id?: string;
    status?: "approved" | "rejected" | "pending";
    paid?: boolean;
  };
  if (!body.id) return NextResponse.json({ error: "参数无效" }, { status: 400 });
  const current = await readApplication(body.id);
  if (!current) return NextResponse.json({ error: "申请不存在" }, { status: 404 });

  let next = { ...current };
  if (body.paid === true) {
    const mistakenLive = current.status === "approved" && !current.paidAt;
    next = {
      ...next,
      paidAt: next.paidAt ?? new Date().toISOString(),
      status: mistakenLive ? "pending" : next.status,
    };
  }
  if (body.status === "rejected" || body.status === "pending") {
    next = { ...next, status: body.status };
  } else if (body.status === "approved") {
    if (!next.paidAt) return NextResponse.json({ error: "尚未标记收款，不能上架" }, { status: 409 });
    next = { ...next, status: "approved" };
  } else if (body.paid !== true) {
    return NextResponse.json({ error: "参数无效" }, { status: 400 });
  }

  await saveApplication(next);
  return NextResponse.json({ application: next });
}
