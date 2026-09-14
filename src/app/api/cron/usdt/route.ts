import { NextRequest, NextResponse } from "next/server";
import { workerSecret } from "@/lib/runtime-env";
import { settleUsdtApplications } from "@/lib/usdt-settle";
import { DEFAULT_USDT_RECEIVE_ADDRESS, validEvmAddress } from "@/lib/usdt";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const expected = (await workerSecret("CRON_SECRET")) || (await workerSecret("ADMIN_TOKEN"));
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({})) as { id?: string };
  const configured = await workerSecret("USDT_ERC20_ADDRESS");
  const address = validEvmAddress(configured) ? configured : DEFAULT_USDT_RECEIVE_ADDRESS;
  const result = await settleUsdtApplications({
    receiveAddress: address,
    apiKey: await workerSecret("ETHERSCAN_API_KEY"),
    onlyId: body.id,
  });
  return NextResponse.json({
    settled: result.settled.length,
    checked: result.checked,
    applications: result.settled,
  });
}
